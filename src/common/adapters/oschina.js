import PjaxAdapter from './pjax';
import extStore from '../core.storage';
import { DICT, EVENT, STORE } from '../core.constants';
import { isValidTimeStamp } from '../util.misc';
import octotree from '../core.api';
import * as giteeDetect from './pageDetect/gitee';
import './oschina.less';

const OSC_RESERVED_USER_NAMES = [
  'explore',
  'repositories',
  'popular',
  'enterprises',
  'gists',
  'dashboard',
  'languages',
  'search',
  'links',
  'invite',
  'profile',
  'organizations',
  'notifications',
  'login',
  'signup',
  'oauth',
];
const OSC_RESERVED_REPO_NAMES = [
  'admin',
  'dashboard',
  'groups',
  'help',
  'profile',
  'projects',
  'search',
  'codes',
  'fork_project',
  'fork_code',
  'events',
];
const OSC_PJAX_CONTAINER_SEL = '#tree-holder';
const OSC_CONTAINERS = '#git-header-nav';
const OSC_EXTENSION_DOM = '.gitee-project-extension';

class Oschina extends PjaxAdapter {
  constructor() {
    super(OSC_PJAX_CONTAINER_SEL);
  }

  detect = giteeDetect;

  // @override
  init($sidebar) {
    const pjaxContainer = $(OSC_PJAX_CONTAINER_SEL)[0];
    super.init($sidebar, { pjaxContainer: pjaxContainer });

    // Fix #151 by detecting when page layout is updated.
    // In this case, split-diff page has a wider layout, so need to recompute margin.
    // Note that couldn't do this in response to URL change, since new DOM via pjax might not be ready.
    const diffModeObserver = new window.MutationObserver(mutations => {
      mutations.forEach(mutation => {
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
    return DICT.OSCHINA;
  }

  // @override
  getCssClass() {
    return 'gitmaster-gitee-sidebar';
  }

  // @override
  canLoadEntireTree() {
    return true;
  }

  // @override
  getCreateTokenUrl() {
    return 'https://gitee.com/profile/personal_access_tokens/new';
  }

  // @override
  updateLayout(sidebarPinned, sidebarVisible, sidebarWidth, isSidebarLeft) {
    const SPACING = 220;
    const $containers = $(OSC_CONTAINERS);

    const WIDTH = $(document).width() - SPACING;
    const shouldPushEverything = sidebarPinned && sidebarVisible;

    const direction = isSidebarLeft ? 'left' : 'right';

    $('html').css({
      [`margin-${direction}`]: shouldPushEverything ? sidebarWidth : '',
      [`margin-${direction === 'left' ? 'right' : 'left'}`]: '',
    });
    $containers.css({
      [`margin-${direction}`]: shouldPushEverything ? sidebarWidth : '',
      [`margin-${direction === 'left' ? 'right' : 'left'}`]: '',
    });
    $containers.css('width', shouldPushEverything ? WIDTH : '');

    $('.git-project-download-panel').css('margin-right', shouldPushEverything ? 240 : '');
  }

  async getRepoDataWrap(currentRepo, token) {
    if (!giteeDetect.shouldEnable()) {
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

  async getRepoFromPath(currentRepo, token, cb) {
    if (!giteeDetect.shouldEnable()) {
      return cb();
    }

    await this.getRepoData(currentRepo, token, cb);
  }

  async getRepoData(currentRepo, token, cb) {
    // (username)/(reponame)[/(type)][/(typeId)]
    // eslint-disable-next-line no-useless-escape
    const match = window.location.pathname.match(/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?(?:\/([^\/]+))?/);
    if (!match) {
      return cb();
    }

    const username = match[1];
    const reponame = match[2];
    const type = match[3];
    const typeId = match[4];

    const isPR = type === 'pulls';

    // Not a repository, skip
    if (~OSC_RESERVED_USER_NAMES.indexOf(username) || ~OSC_RESERVED_REPO_NAMES.indexOf(reponame)) {
      return cb();
    }

    // Get branch by inspecting page, quite fragile so provide multiple fallbacks
    const branch =
      // Use the commit ID when showing a particular commit
      (type === 'commit' && typeId) ||
      // Use 'master' when viewing repo's releases or tags
      ((type === 'releases' || type === 'tags') && 'master') ||
      // Code page
      $('#git-project-branch .text')
        .text()
        .trim() ||
      ($('#git-project-summary .viewer-wrapper li:eq(0)').attr('href') || '').replace(`/${username}/${reponame}/commits/`, '') ||
      // The above should work for tree|blob, but if DOM changes, fallback to use ID from URL
      ((type === 'tree' || type === 'blob') && typeId) ||
      // Use target branch in a PR page
      (isPR ? ($('.pull-detail-segment .branch:eq(1) a').text() || ':').match(/:(.*)/)[1] : null) ||
      // Reuse last selected branch if exist
      (currentRepo.username === username && currentRepo.reponame === reponame && currentRepo.branch) ||
      // Get default branch from cache
      this._defaultBranch[username + '/' + reponame];

    const showOnlyChangedInPR = await extStore.get(STORE.PR);
    const pullNumber = isPR && showOnlyChangedInPR ? typeId : null;
    const pullHead = isPR ? ($('.pull-detail-segment .branch:eq(0) a').text() || ':').match(/:(.*)/)[1] : null;
    const displayBranch = isPR && pullHead ? `${branch} < ${pullHead}` : null;

    // Still no luck, get default branch for real
    const repo = {
      username: username,
      reponame: reponame,
      branch: branch,
      displayBranch,
      pullNumber,
    };

    if (repo.branch) {
      cb(null, repo);
    } else {
      this._get(
        null,
        {
          repo,
          token,
        },
        (err, data) => {
          if (err) return cb(err);
          // eslint-disable-next-line no-multi-assign
          repo.branch = this._defaultBranch[username + '/' + reponame] = data.default_branch || 'master';
          cb(null, repo);
        }
      );
    }
  }

  // @override
  selectFile(path, opts = {}) {
    // Do nothing if file is already selected.
    if (window.location.pathname === path) return;

    const fragment = opts.fragment;

    // If we're on the same page and just navigating to a different anchor
    // Don't bother fetching the page with pjax
    const pathWithoutAnchor = path.replace(/#.*$/, '');
    const isSamePage = window.location.pathname === pathWithoutAnchor;
    const loadWithPjax = $(this._pjaxContainerSel).length && !isSamePage;

    if (loadWithPjax) {
      const url = window.location.protocol + '//' + window.location.host + path;
      window.history.pushState(
        {
          cache: true,
        },
        null,
        url
      );

      $.ajax({
        url: url,
        dataType: 'script',
        beforeSend: function() {
          $(document).trigger(EVENT.REQ_START);
          return $('.tree_progress').show();
        },
        complete: function() {
          $(document).trigger(EVENT.REQ_END);

          return $('.tree_progress').hide();
        },
      });
    } else {
      super.selectFile(path);
    }
  }

  // @override
  loadCodeTree(opts, cb) {
    opts.encodedBranch = encodeURIComponent(decodeURIComponent(opts.repo.branch));
    opts.path = (opts.node && (opts.node.sha || opts.encodedBranch)) || opts.encodedBranch + '?recursive=1';
    this._loadCodeTreeInternal(opts, null, cb);
  }

  // @override
  getAccessToken() {
    return window.extStore.get(window.STORE.GITEE_TOKEN);
  }

  // @override
  _getTree(path, opts, cb) {
    if (opts.repo.pullNumber) {
      this._getPatch(opts, cb);
    } else {
      this._get(`/git/trees/${path}`, opts, (err, res) => {
        if (err) {
          cb(err);
        } else {
          cb(null, res.tree);
        }
      });
    }
  }

  // @override
  async shouldLoadEntireTree(repo) {
    const isLoadingPr = (await extStore.get(STORE.PR)) && repo.pullNumber;
    if (isLoadingPr) {
      return true;
    }

    return false;
  }

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
    cb();
    // const item = tree.filter((item) => /^\.gitmodules$/i.test(item.path))[0]
    // if (!item) return cb()
    // this._get(`/git/blobs/${item.sha}`, opts, (err, res) => {
    //     if (err) return cb(err)
    //     const data = atob(res.content.replace(/\n/g, ''))
    //     cb(null, parseGitmodules(data))
    // })
  }

  getContentPath() {
    let str = window.location.href;
    let result = str.match(/.*[bt][lr][oe][be]\/[^//]+\/(.*)/); // blob/tree :D
    return result && result.length && result[1];
  }

  async getContent(path, opts) {
    const host = window.location.protocol + '//' + (window.location.host === 'gitee.com' ? 'gitee.com' : window.location.host) + '/api/v5';
    const url = `${host}/repos/${opts.repo.username}/${opts.repo.reponame}`;

    const contentPath = path || this.getContentPath() || '';

    let contentParams = '';

    const branch = encodeURIComponent(decodeURIComponent(opts.repo.branch));

    if (!opts.isRepoMetaData) {
      contentParams = '/contents/' + contentPath + '?ref=' + branch;
    }

    const cfg = {
      url: `${url}${contentParams}`,
      method: 'GET',
      cache: false,
    };

    const token = await this.getAccessToken();

    if (token) {
      cfg.headers = { Authorization: 'token ' + token };
    }

    return new Promise((resolve, reject) => {
      $.ajax(cfg)
        .done((data, textStatus, jqXHR) => {
          resolve(data, jqXHR);
        })
        .fail(jqXHR => this._handleError(cfg, jqXHR, resolve));
    });
  }

  _get(path, opts, cb) {
    const host = window.location.protocol + '//' + window.location.host;
    let url = `${host}/api/v5/repos/${opts.repo.username}/${opts.repo.reponame}${path || ''}`;
    const request = retry => {
      if (opts.token) {
        url += (url.indexOf('?') >= 0 ? '&' : '?') + `access_token=${opts.token}`;
      }
      const cfg = {
        url,
        method: 'GET',
        cache: false,
        xhrFields: {
          withCredentials: true,
        },
      };

      $.ajax(cfg)
        .done(data => {
          if (path && path.indexOf('/git/trees') === 0 && data.truncated) {
            this._handleError(cfg, { status: 206 }, cb);
          } else {
            cb(null, data);
          }
        })
        .fail(jqXHR => {
          this._handleError(cfg, jqXHR, cb);
        });
    };
    request(true);
  }

  _getExtensionValue(key) {
    const $extension = $(OSC_EXTENSION_DOM);
    return (
      $extension
        .find(`.${key}`)
        .text()
        .trim() || ''
    );
  }

  async _handleError(settings, jqXHR, cb) {
    let error;
    let message;

    switch (jqXHR.status) {
      case 0:
        error = 'Connection error';
        message = `Cannot connect to website.
          If your network connection to this website is fine, maybe there is an outage of the API.
          Please try again later.`;
        break;
      case 401:
        error = 'Invalid token';
        message = await octotree.getInvalidTokenMessage({
          responseStatus: jqXHR.status,
          requestHeaders: settings.headers,
        });
        break;
      case 404:
        if (jqXHR.responseJSON.message === '404 Tree Not Found') {
          error = 'Empty repository';
          message = 'This repository is empty.';
          // eslint-disable-next-line no-empty
        } else if (jqXHR.responseJSON.message === '404 Project Not Found') {
        } else {
          error = 'Repository not found';
          message = 'Accessing private repositories requires access token. ' + 'Please go to <a class="settings-btn">Settings</a> and enter a token.';
        }
        break;
      case 403:
        if (jqXHR.getResponseHeader('RateLimit-Remaining') === '0') {
          // It's kinda specific for GitHub
          error = 'API limit exceeded';
          message =
            'You have exceeded the <a href="https://developer.github.com/v3/#rate-limiting">GitHub API rate limit</a>. ' +
            'To continue using GitMaster, you need to provide a GitHub access token. ' +
            'Please go to <a class="settings-btn">Settings</a> and enter a token.';
        } else {
          error = 'Forbidden';
          message = 'Accessing private repositories requires access token. ' + 'Please go to <a class="settings-btn">Settings</a> and enter a token.';
        }

        break;

      // Fallback message
      default:
        // eslint-disable-next-line no-multi-assign
        error = message = jqXHR.statusText;
        break;
    }
    cb({
      error: `Error: ${error}`,
      message: message,
      status: jqXHR.status,
    });
  }

  _getPatchHref(repo, patch) {
    return `/${repo.username}/${repo.reponame}/pulls/${repo.pullNumber}/files#diff-${patch.diffId}`;
  }
}

export default Oschina;
