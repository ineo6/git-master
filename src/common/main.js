// eslint-disable-next-line import/no-unresolved
import key from 'key';
import { browser } from 'webextension-polyfill-ts';
import octotree from './core.api';
import { i18n, injectCustomJs } from './util.ext';
import TreeView from './view.tree';
import RepoView from './view.repo';
import OptionsView from './view.options';
import HelpPopup from './view.help';
import ErrorView from './view.error';
import extStore from './core.storage';
import { ADDON_CLASS, DICT, EVENT, PINNED_CLASS, SHOW_CLASS, STORE } from './core.constants';
import GitHub from './adapters/github';
import Gitlab from './adapters/gitlab';
import Oschina from './adapters/oschina';

/**
 * @return {number}
 */
async function whichSite() {
  const currentUrl = `${window.location.protocol}//${window.location.host}`;

  const sites = {
    async isGitLab() {
      const customDomains = await extStore.get(STORE.GITLAB_ENTERPRICE_URLS);

      const domainArr = customDomains ? customDomains.split('\n') : [];

      const urls = ['https://gitlab.com'].concat(domainArr);

      return urls.indexOf(currentUrl) >= 0;
    },
    async isOsChina() {
      const customDomains = await extStore.get(STORE.GITEE_ENTERPRICE_URLS);

      const domainArr = customDomains ? customDomains.split('\n') : [];

      const urls = [
        'http://git.oschina.net', 'https://git.oschina.net',
        'http://gitee.com', 'https://gitee.com',
      ].concat(domainArr);

      return urls.indexOf(currentUrl) >= 0;
    },
    async isGitHub() {
      const customDomains = await extStore.get(STORE.GITHUB_ENTERPRICE_URLS);

      const domainArr = customDomains ? customDomains.split('\n') : [];

      const urls = ['https://github.com'].concat(domainArr);

      return urls.indexOf(currentUrl) >= 0;
    },
  };

  const isGitLab = await sites.isGitLab();
  const isOsChina = await sites.isOsChina();
  const isGitHub = await sites.isGitHub();

  if (isGitLab) {
    return DICT.GITLAB;
  } else if (isGitHub) {
    return DICT.GITHUB;
  } else if (isOsChina) {
    return DICT.OSCHINA;
  }
}

async function createAdapter() {
  const siteType = await whichSite();

  // eslint-disable-next-line default-case
  switch (siteType) {
    case DICT.GITHUB:
      return new GitHub();
    case DICT.GITLAB:
      return new Gitlab();
    case DICT.OSCHINA:
      return new Oschina();
  }
}


class Main {
  // eslint-disable-next-line no-empty-function
  constructor(adapter) {
  }

  async loadExtension(adapter, activationOpts = {}) {
    this.$html = $('html');
    this.$document = $(document);
    const $dom = $(TEMPLATE);
    this.$sidebar = $dom.find('.gitmaster-sidebar');
    this.$toggler = this.$sidebar.find('.gitmaster-toggle')
      .hide();
    this.$views = this.$sidebar.find('.gitmaster-view');
    const $spinner = this.$sidebar.find('.gitmaster-spin');
    this.$pinner = this.$sidebar.find('.gitmaster-pin');
    this.treeView = new TreeView($dom, adapter);
    this.repoView = new RepoView(this.$document, adapter);
    const optsView = new OptionsView($dom, adapter, this.$sidebar);
    const helpPopup = new HelpPopup($dom);
    this.errorView = new ErrorView($dom);

    this.adapter = adapter;
    this.currRepo = false;
    this.hasError = false;

    this.$pinner.click(this.togglePin);
    await this.setupSidebarFloatingBehaviors();
    this.setHotkeys(await extStore.get(STORE.HOTKEYS));

    if (!this.$html.hasClass(ADDON_CLASS)) this.$html.addClass(ADDON_CLASS);

    $(window)
      .resize((event) => {
        if (event.target === window) this.layoutChanged();
      });

    const showView = this.showView;
    const $document = this.$document;
    const treeView = this.treeView;

    for (const view of [this.treeView, this.errorView, optsView]) {
      $(view)
      // eslint-disable-next-line no-loop-func
        .on(EVENT.VIEW_READY, async function(event) {
          if (this !== optsView) {
            $document.trigger(EVENT.REQ_END);

            optsView.$toggler.removeClass('selected');

            if (adapter.isOnPRPage && await extStore.get(STORE.PR)) {
              treeView.$tree.jstree('open_all');
            }
          }
          showView(this);
        })
        .on(EVENT.VIEW_CLOSE, (event, data) => {
          if (data && data.showSettings) {
            optsView.toggle(true);
          } else {
            showView(this.hasError ? this.errorView : this.treeView);
          }
        })
        .on(EVENT.FETCH_ERROR, (event, err) => this.showError(err));
    }

    $(extStore)
      .on(EVENT.STORE_CHANGE, this.optionsChanged);

    this.$document
      .on(EVENT.REQ_START, () => $spinner.addClass('gitmaster-spin--loading'))
      .on(EVENT.REQ_END, () => $spinner.removeClass('gitmaster-spin--loading'))
      .on(EVENT.LAYOUT_CHANGE, this.layoutChanged)
      .on(EVENT.TOGGLE_PIN, this.layoutChanged)
      .on(EVENT.LOC_CHANGE, (event, reload = false) => this.tryLoadRepo(reload));

    this.$sidebar
      .addClass(adapter.getCssClass())
      .width(Math.min(parseInt(await extStore.get(STORE.WIDTH), 10), 1000))
      .resize(() => this.layoutChanged(true))
      .appendTo($('body'));

    this.$document.trigger(EVENT.SIDEBAR_HTML_INSERTED);

    adapter.init(this.$sidebar);
    await helpPopup.init();

    await octotree.activate(
      {
        adapter,
        $document: this.$document,
        $dom,
        $sidebar: this.$sidebar,
        $toggler: this.$toggler,
        $views: this.$views,
        treeView: this.treeView,
        optsView,
        errorView: this.errorView,
      },
      activationOpts,
    );

    return this.tryLoadRepo();
  }


  /**
   * Invoked when the user saves the option changes in the option view.
   * @param {!string} event
   * @param {!Object<!string, [(string|boolean), (string|boolean)]>} changes
   */
  optionsChanged = async (event, changes) => {
    let reload = false;

    Object.keys(changes)
      .forEach((storeKey) => {
        const [oldValue, newValue] = changes[storeKey];

        // eslint-disable-next-line default-case
        switch (storeKey) {
          case STORE.TOKEN:
          case STORE.LAZYLOAD:
          case STORE.ICONS:
            reload = true;
            break;
          case STORE.PR:
            reload = this.adapter.isOnPRPage;
            break;
          case STORE.HOVEROPEN:
            this.handleHoverOpenOption(newValue);
            break;
          case STORE.HOTKEYS:
            this.setHotkeys(newValue, oldValue);
            break;
          case STORE.PINNED:
            this.onPinToggled(newValue);
            break;
        }
      });

    if (await octotree.applyOptions(changes)) {
      reload = true;
    }

    if (reload) {
      await this.tryLoadRepo(true);
    }
  };

  async tryLoadRepo(reload) {
    const token = await this.adapter.getAccessToken();
    await this.adapter.getRepoFromPath(this.currRepo, token, async (err, repo) => {
      if (err) {
        // Error making API, likely private repo but no token
        await this.showError(err);
        if (!this.isSidebarVisible()) {
          this.$toggler.show();
        }
      } else if (repo) {
        if (await extStore.get(STORE.PINNED) && !this.isSidebarVisible()) {
          // If we're in pin mode but sidebar doesn't show yet, show it.
          // Note if we're from another page back to code page, sidebar is "pinned", but not visible.
          if (this.isSidebarPinned()) {
            await this.toggleSidebar();
          } else {
            await this.onPinToggled(true);
          }
        } else if (this.isSidebarVisible()) {
          const replacer = ['username', 'reponame', 'branch', 'pullNumber'];
          const repoChanged = JSON.stringify(repo, replacer) !== JSON.stringify(this.currRepo, replacer);
          if (repoChanged || reload === true) {
            this.hasError = false;
            this.$document.trigger(EVENT.REQ_START);
            this.currRepo = repo;
            this.treeView.show(repo, token);
          } else {
            await this.treeView.syncSelection(repo);
          }
        } else {
          // Sidebar not visible (because it's not pinned), show the toggler
          this.$toggler.show();
        }
      } else {
        // Not a repo or not to be shown in this page
        this.$toggler.hide();
        this.toggleSidebar(false);
      }
      await this.layoutChanged();
    });
  }

  showView = (view) => {
    this.$views.removeClass('current');
    view.$view.addClass('current');
    $(view)
      .trigger(EVENT.VIEW_SHOW);
  };

  async showError(err) {
    this.hasError = true;
    this.errorView.show(err);

    if (await extStore.get(STORE.PINNED)) await this.togglePin(true);
  }

  async toggleSidebar(visibility) {
    if (visibility !== undefined) {
      if (this.isSidebarVisible() === visibility) return;
      await this.toggleSidebar();
    } else {
      this.$html.toggleClass(SHOW_CLASS);
      this.$document.trigger(EVENT.TOGGLE, this.isSidebarVisible());

      // Ensure the repo is loaded when the sidebar shows after being hidden.
      // Note that tryLoadRepo() already takes care of not reloading if nothing changes.
      if (this.isSidebarVisible()) {
        this.$toggler.show();
        await this.tryLoadRepo();
      }
    }

    return visibility;
  }

  togglePin = async (isPinned) => {
    if (isPinned !== undefined) {
      if (this.isSidebarPinned() === isPinned) return;
      return this.togglePin();
    }

    const sidebarPinned = !this.isSidebarPinned();
    await extStore.set(STORE.PINNED, sidebarPinned);
    return sidebarPinned;
  };

  async onPinToggled(isPinned) {
    if (isPinned === this.isSidebarPinned()) {
      return;
    }

    this.$pinner.toggleClass(PINNED_CLASS);

    const sidebarPinned = this.isSidebarPinned();

    this.$pinner.find('.master-tooltip')
      .attr('aria-label', sidebarPinned ? browser.i18n.getMessage('unpin_sidebar_tip') : browser.i18n.getMessage('pin_sidebar_tip'));
    this.$document.trigger(EVENT.TOGGLE_PIN, sidebarPinned);
    await this.toggleSidebar(sidebarPinned);
  }

  layoutChanged = async (save = false) => {
    const width = this.$sidebar.outerWidth();

    const isLeft = await this.isSidebarLeft();
    this.adapter.updateLayout(this.isSidebarPinned(), this.isSidebarVisible(), width, isLeft);
    if (save === true) {
      await extStore.set(STORE.WIDTH, width);
    }
  };

  /**
   * Controls how the sidebar behaves in float mode (i.e. non-pinned).
   */
  async setupSidebarFloatingBehaviors() {
    const MOUSE_LEAVE_DELAY = 400;
    const KEY_PRESS_DELAY = 4000;
    let isMouseInSidebar = false;

    this.handleHoverOpenOption(await extStore.get(STORE.HOVEROPEN));

    // Immediately closes if click outside the sidebar.
    this.$document.on('click', () => {
      if (!isMouseInSidebar && !this.isSidebarPinned() && this.isSidebarVisible()) {
        this.toggleSidebar(false);
      }
    });

    let timerId = null;

    const clearTimer = () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const startTimer = (delay) => {
      if (!isMouseInSidebar && !this.isSidebarPinned()) {
        clearTimer();
        timerId = setTimeout(() => this.toggleSidebar(this.isSidebarPinned()), delay);
      }
    };

    this.$document.on('mouseover', () => {
      // Ensure startTimer being executed only once when mouse is moving outside the sidebar
      if (!timerId) {
        isMouseInSidebar = false;
        startTimer(MOUSE_LEAVE_DELAY);
      }
    });

    this.$sidebar
      .on('keyup', () => startTimer(KEY_PRESS_DELAY))
      .on('mouseover', (event) => {
        // Prevent mouseover from propagating to document
        event.stopPropagation();
      })
      .on('mousemove', (event) => {
        // Don't do anything while hovering on Toggler
        const isHoveringToggler = this.$toggler.is(event.target) || this.$toggler.has(event.target).length;
        if (isHoveringToggler) return;

        isMouseInSidebar = true;
        clearTimer();

        if (!this.isSidebarVisible()) {
          this.toggleSidebar(true);
        }
      });
  }

  onTogglerHovered = () => {
    this.toggleSidebar(true);
  };

  onTogglerClicked = (event) => {
    event.stopPropagation();
    this.toggleSidebar(true);
  };

  handleHoverOpenOption(enableHoverOpen) {
    if (enableHoverOpen) {
      this.$toggler.off('click', this.onTogglerClicked);
      this.$toggler.on('mouseenter', this.onTogglerHovered);
    } else {
      this.$toggler.off('mouseenter', this.onTogglerHovered);
      this.$toggler.on('click', this.onTogglerClicked);
    }
  }

  /**
   * Set new hot keys to pin or unpin the sidebar.
   * @param {string} newKeys
   * @param {string?} oldKeys
   */
  setHotkeys(newKeys, oldKeys) {
    key.filter = () => this.$sidebar.is(':visible');
    if (oldKeys) key.unbind(oldKeys);
    key(newKeys, async () => {
      if (await this.togglePin()) this.treeView.focus();
    });
  }

  isSidebarVisible() {
    return this.$html.hasClass(SHOW_CLASS);
  }

  isSidebarPinned() {
    return this.$pinner.hasClass(PINNED_CLASS);
  }

  async isSidebarLeft() {
    const direction = await extStore.get(STORE.DIRECTION);
    return direction === 'left';
  }
}


function init() {
  $(document)
    .ready(() => {
      createAdapter()
        .then((adapter) => {
          if (adapter) {
            octotree.load(async () => {
              const main = new Main();
              await main.loadExtension(adapter);

              i18n();
            });
            injectCustomJs();
          }
        });
    });
}

export default init;
