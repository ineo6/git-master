import { EVENT, SIDEBAR_RIGHT, STORE } from './core.constants';
import extStore from './core.storage';
import { parallel } from './util.misc';

class OptionsView {
  constructor($dom, adapter, $sidebar) {
    this.adapter = adapter;
    this.$toggler = $dom.find('.gitmaster-settings')
      .click(this.toggle);

    this.$direction = $dom.find('#direction')
      .click(this.changeDirectionWrapper.bind(this));

    this.$view = $dom.find('.gitmaster-settings-view')
      .submit((event) => {
        event.preventDefault();
        this.toggle(false);
      });

    this.$sidebar = $sidebar;

    this.$view.find('a.gitmaster-create-token')
      .attr('href', this.adapter.getCreateTokenUrl());

    this.$view.find('.master-tabs-tab')
      .click(this.handleTabClick);

    this.loadElements();

    // Hide options view when sidebar is hidden
    $(document)
      .on(EVENT.TOGGLE, (event, visible) => {
        if (!visible) this.toggle(false);
      });

    this.changeDirection(true);
  }

  /**
   * Load elements with [data-store] attributes & attach enforeShowInRule to the
   * elements in the show in section. Invoke this if there are dynamically added
   * elements, so that they can be loaded and saved.
   */
  loadElements() {
    this.elements = this.$view.find('[data-store]')
      .toArray();
  }

  /**
   * Toggles the visibility of this screen.
   */
  toggle = (visibility) => {
    if (visibility !== undefined) {
      if (this.$view.hasClass('current') === visibility) return;
      return this.toggle();
    }

    if (this.$toggler.hasClass('selected')) {
      this._save();
      this.$toggler.removeClass('selected');
      $(this)
        .trigger(EVENT.VIEW_CLOSE);
    } else {
      this._load();
    }
  };

  handleTabClick(e) {
    const current = $(this);
    const width = current.outerWidth(true);
    const index = current.index();

    current
      .siblings()
      .removeClass('master-tabs-tab-active');

    current.addClass('master-tabs-tab-active');

    const link = $('.master-tabs-ink-bar');
    const content = $('.master-tabs-content');

    link.css({
      transform: `translate3d(${index * width}px, 0px, 0px)`,
    });

    content.css({
      'margin-left': `-${index * 100}%`,
    });
  }

  changeDirectionWrapper(e) {
    this.changeDirection(false, e);
  }

  changeDirection(init, e) {
    parallel(
      [1],
      async (elm, cb) => {
        let value = await extStore.get(STORE.DIRECTION);
        let nextValue = value;

        if (!init) {
          nextValue = value === 'left' ? 'right' : 'left';

          await extStore.set(STORE.DIRECTION, nextValue);

          this.$direction.removeClass(`direction-${value}`)
            .addClass(`direction-${nextValue}`);

          $(document)
            .trigger(EVENT.LAYOUT_CHANGE);
        }
        // 设置全局
        if (nextValue === 'left') {
          this.$sidebar.removeClass(SIDEBAR_RIGHT);
        } else {
          this.$sidebar.addClass(SIDEBAR_RIGHT);
        }
      },
      () => {
      },
    );
  }

  _load() {
    this._eachOption(
      ($elm, key, value, cb) => {
        if ($elm.is(':checkbox')) {
          $elm.prop('checked', value);
        } else if ($elm.is(':radio')) {
          $elm.prop('checked', $elm.val() === value);
        } else {
          $elm.val(value);
        }
        cb();
      },
      () => {
        this.$toggler.addClass('selected');
        $(this)
          .trigger(EVENT.VIEW_READY);
      },
    );
  }

  _save() {
    const changes = {};
    this._eachOption(
      async ($elm, key, value, cb) => {
        if ($elm.is(':radio') && !$elm.is(':checked')) {
          return cb();
        }
        const newValue = $elm.is(':checkbox') ? $elm.is(':checked') : $elm.val();
        if (value === newValue) return cb();
        changes[key] = [value, newValue];
        await extStore.set(key, newValue);
        cb();
      },
      () => {
      },
    );
  }

  _eachOption(processFn, completeFn) {
    parallel(
      this.elements,
      async (elm, cb) => {
        const $elm = $(elm);
        const key = STORE[$elm.data('store')];
        const value = await extStore.get(key);

        processFn($elm, key, value, () => cb());
      },
      completeFn,
    );
  }
}

export default OptionsView;
