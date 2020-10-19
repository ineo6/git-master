import PjaxAdapter from './pjax';
import extStore from '../core.storage';
import { DICT, EVENT, NODE_PREFIX, STORE } from '../core.constants';
import * as githubDetect from './pageDetect/github';

// When Github page loads at repo path e.g. https://github.com/jquery/jquery, the HTML tree has
// <main id="js-repo-pjax-container"> to contain server-rendered HTML in response of pjax.
// However, that <main> element doesn't have "id" attribute if the Github page loads at specific
// File e.g. https://github.com/jquery/jquery/blob/master/.editorconfig.
// Therefore, the below selector uses many path but only points to the same <main> element
const GH_PJAX_CONTAINER_SEL = '#js-repo-pjax-container, div[itemtype="http://schema.org/SoftwareSourceCode"] main, [data-pjax-container]';

const GH_CONTAINERS = '.pagehead > nav, .container, .container-lg, .container-xl, .container-responsive';
const GH_HEADER = '.js-header-wrapper > header';
const GH_HIDDEN_RESPONSIVE_CLASS = '.d-none';
const GH_RESPONSIVE_BREAKPOINT = 1010;

const GIST_RESERVED_TYPE = ['revisions', 'stargazers', 'forks'];
const GIST_RESERVED_ID = ['forked'];

class Gist extends PjaxAdapter {
  constructor() {
    super(GH_PJAX_CONTAINER_SEL);
  }

  detect = githubDetect;

  // @override
  init($sidebar, repoView) {
    repoView && repoView.init();

    super.init($sidebar);

    // Fix #151 by detecting when page layout is updated.
    // In this case, split-diff page has a wider layout, so need to recompute margin.
    // Note that couldn't do this in response to URL change, since new DOM via pjax might not be ready.
    const diffModeObserver = new window.MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // eslint-disable-next-line no-bitwise
        if (~mutation.oldValue.indexOf('split-diff') || ~mutation.target.className.indexOf('split-diff')) {
          return $(document).trigger(EVENT.LAYOUT_CHANGE);
        }
      });
    });

    diffModeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
  }

  whoami() {
    return DICT.GIST;
  }

  // @override
  getCssClass() {
    return 'gitmaster-gist-sidebar';
  }

  // @override
  async shouldLoadEntireTree(repo) {
    const isLoadingPr = (await extStore.get(STORE.PR)) && repo.pullNumber;
    if (isLoadingPr) {
      return true;
    }

    const isGlobalLazyLoad = await extStore.get(STORE.LAZYLOAD);
    if (isGlobalLazyLoad) {
      return false;
    }
  }

  // @override
  getCreateTokenUrl() {
    return `${window.location.protocol}//github.com/settings/tokens/new?` + 'scopes=repo&description=Git%20Master%20extension';
  }

  // @override
  updateLayout(sidebarPinned, sidebarVisible, sidebarWidth, isSidebarLeft) {
    const SPACING = 10;
    const $header = $(GH_HEADER);
    const $containers = $('html').width() <= GH_RESPONSIVE_BREAKPOINT ? $(GH_CONTAINERS).not(GH_HIDDEN_RESPONSIVE_CLASS) : $(GH_CONTAINERS);

    const autoMarginLeft = ($(document).width() - $containers.width()) / 2;
    const shouldPushEverything = sidebarPinned && sidebarVisible;

    const direction = isSidebarLeft ? 'left' : 'right';

    if (shouldPushEverything) {
      $('html').css({
        [`margin-${direction}`]: sidebarWidth,
        [`margin-${direction === 'left' ? 'right' : 'left'}`]: '',
      });

      // $header.attr('style', `padding-left: ${sidebarWidth + SPACING - autoMarginLeft}px !important`);
    } else {
      $('html').css({
        [`margin-${direction}`]: '',
        [`margin-${direction === 'left' ? 'right' : 'left'}`]: '',
      });

      $header.removeAttr('style');
    }
  }

  async getRepoData(currentRepo, token, cb) {
    // (username)/(gistId)[/(sha)]
    // eslint-disable-next-line no-useless-escape
    const match = window.location.pathname.match(/([^\/]+)\/([a-zA-Z0-9]+)(?:\/([^\/]+))?(?:\/([^\/]+))?/);

    const username = match[1];
    const gistId = match[2];
    const shaType = match[3];

    // Not a gist, skip
    if (!gistId || GIST_RESERVED_ID.indexOf(gistId) >= 0) {
      return cb();
    }

    const repo = {
      username,
      reponame: 'gist',
      gistId,
      branch: GIST_RESERVED_TYPE.indexOf(shaType) === -1 && /[a-zA-Z0-9]{40}/.test(shaType) ? shaType : '',
    };

    repo.displayBranch = repo.branch === '' ? 'latest' : repo.branch;

    cb(null, repo);
  }

  async getRepoDataWrap(currentRepo, token) {
    if (!githubDetect.shouldEnable()) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.getRepoData(currentRepo, token, (error, result) => {
        if (!error) {
          resolve(result);
        }
        if (typeof error === 'string') {
          resolve('');
        }
        resolve('');
      });
    });
  }

  // @override
  async getRepoFromPath(currentRepo, token, cb) {
    if (!githubDetect.shouldEnableGist()) {
      return cb();
    }

    await this.getRepoData(currentRepo, token, cb);
  }

  // @override
  loadCodeTree(opts, cb) {
    opts.encodedBranch = encodeURIComponent(decodeURIComponent(opts.repo.branch));
    opts.path = (opts.node && (opts.node.sha || opts.encodedBranch)) || opts.encodedBranch;
    this._loadCodeTreeInternal(
      opts,
      function(item) {
        return {
          path: item.filename,
          fileExt: item.type,
          type: 'blob',
          sha: '',
          size: item.size,
          url: item.raw_url,
          content: item.content,
        };
      },
      cb
    );
  }

  // @override
  getAccessToken() {
    return window.extStore.get(window.STORE.GIST_TOKEN);
  }

  decodeFileName(name) {
    return decodeURIComponent(name)
      .trim()
      .toLowerCase()
      .replace(/[.\s]+/g, '-');
  }

  // @override
  getItemHref(repo, type, encodedPath, encodedBranch) {
    return `/${repo.username}/${repo.gistId}${encodedBranch ? '/' + encodedBranch : ''}#file-${this.decodeFileName(encodedPath)}`;
  }

  // @override
  selectFile(path) {
    window.location.href = path;
  }

  // @override
  _getTree(path, opts, cb) {
    this._get(`${path}`, opts, (err, res) => {
      if (err) {
        cb(err);
      } else {
        const result = Object.keys(res.files).map(key => res.files[key]);

        cb(null, result);
      }
    });
  }

  /**
   * Get files that were patched in Pull Request.
   * The diff map that is returned contains changed files, as well as the parents of the changed files.
   * This allows the tree to be filtered for only folders that contain files with diffs.
   * @param {Object} opts: {
   *                  path: the starting path to load the tree,
   *                  repo: the current repository,
   *                  node (optional): the selected node (null to load entire tree),
   *                  token (optional): the personal access token
   *                 }
   * @param {Function} cb(err: error, diffMap: Object)
   */
  _getPatch(opts, cb) {
    const { pullNumber } = opts.repo;

    this._get(`/pulls/${pullNumber}/files?per_page=300`, opts, (err, res) => {
      if (err) {
        cb(err);
      } else {
        const diffMap = {};

        res.forEach((file, index) => {
          // Record file patch info
          diffMap[file.filename] = {
            type: 'blob',
            diffId: index,
            action: file.status,
            additions: file.additions,
            blob_url: file.blob_url,
            deletions: file.deletions,
            filename: file.filename,
            path: file.path,
            sha: file.sha,
          };

          // Record ancestor folders
          const folderPath = file.filename
            .split('/')
            .slice(0, -1)
            .join('/');
          const split = folderPath.split('/');

          // Aggregate metadata for ancestor folders
          split.reduce((path, curr) => {
            if (path.length) {
              path = `${path}/${curr}`;
            } else {
              path = `${curr}`;
            }

            if (diffMap[path] == null) {
              diffMap[path] = {
                type: 'tree',
                filename: path,
                filesChanged: 1,
                additions: file.additions,
                deletions: file.deletions,
              };
            } else {
              diffMap[path].additions += file.additions;
              diffMap[path].deletions += file.deletions;
              diffMap[path].filesChanged++;
            }
            return path;
          }, '');
        });

        // Transform to emulate response from get `tree`
        const tree = Object.keys(diffMap).map(fileName => {
          const patch = diffMap[fileName];
          return {
            patch,
            path: fileName,
            sha: patch.sha,
            type: patch.type,
            url: patch.blob_url,
          };
        });

        // Sort by path, needs to be alphabetical order (so parent folders come before children)
        // Note: this is still part of the above transform to mimic the behavior of get tree
        tree.sort((a, b) => a.path.localeCompare(b.path));

        cb(null, tree);
      }
    });
  }

  // @override
  _getSubmodules(tree, opts, cb) {
    cb(null);
  }

  async loadRepoData(path, isRepoMetaData = false) {
    const token = await this.getAccessToken();

    try {
      const repo = await this.getRepoDataWrap(false, token);

      if (repo) {
        const data = await this.getContent(path, {
          repo,
          isRepoMetaData,
        });

        return {
          repo,
          contentData: data,
        };
      }
    } catch (e) {
      return false;
    }
  }

  async getGists(path, opts) {
    opts.token = await this.getAccessToken();

    return new Promise(resolve => {
      this._getTree(path, opts, (err, tree) => {
        resolve(tree);
      });
    });
  }

  _get(path, opts, cb) {
    const host = window.location.protocol + '//' + (window.location.host === 'gist.github.com' ? 'api.github.com' : window.location.host + '/api/v3');
    let url = `${host}/gists/${opts.repo.gistId}${path ? '/' + path : ''}`;

    const cfg = {
      url,
      method: 'GET',
      cache: true,
    };

    if (opts.token) {
      cfg.headers = { Authorization: 'token ' + opts.token };
    }

    $.ajax(cfg)
      .done((data, textStatus, jqXHR) => {
        (async () => {
          cb(null, data, jqXHR);
        })();
      })
      .fail(jqXHR => this._handleError(cfg, jqXHR, cb));
  }
}

export default Gist;
