import PjaxAdapter from './pjax';
import extStore from '../core.storage';
import { DICT, EVENT, STORE } from '../core.constants';
import { parseGitmodules } from '../util.misc';
import { sendMessageToContentScriptByPostMessage } from '../util.ext';
import octotree from '../core.api';

const GL_RESERVED_USER_NAMES = [
  'u', 'dashboard', 'projects', 'users', 'help',
  'explore', 'profile', 'public', 'groups', 'abuse_reports',
];
const GL_RESERVED_TYPES = ['raw'];
const GL_RESERVED_REPO_NAMES = [];

const GL_PJAX_CONTAINER_SEL = '#tree-holder';

const GL_CONTAINERS = '.container, .container-lg, .container-responsive';
const GL_HEADER = '.navbar-gitlab';
const GL_MAX_HUGE_REPOS_SIZE = 50;
const GL_HIDDEN_RESPONSIVE_CLASS = '.d-none';
const GL_RESPONSIVE_BREAKPOINT = 1010;

class Gitlab extends PjaxAdapter {
  constructor() {
    super(GL_PJAX_CONTAINER_SEL);

    $(document)
      .on('pjax:end', (e) => {
        sendMessageToContentScriptByPostMessage({
          type: 'gitlab',
          handle: 'highlight',
        });
      });
  }

  // @override
  init($sidebar) {
    super.init($sidebar);

    // Fix #151 by detecting when page layout is updated.
    // In this case, split-diff page has a wider layout, so need to recompute margin.
    // Note that couldn't do this in response to URL change, since new DOM via pjax might not be ready.
    const diffModeObserver = new window.MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (~mutation.oldValue.indexOf('split-diff') || ~mutation.target.className.indexOf('split-diff')) {
          return $(document)
            .trigger(EVENT.LAYOUT_CHANGE);
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
    return DICT.GITLAB;
  }

  // @override
  getCssClass() {
    return 'gitmaster-github-sidebar';
  }

  // @override
  getItemHref(repo, type, encodedPath, encodedBranch) {
    return `/${repo.username}/${repo.reponame}/${type}/${encodedBranch}/${encodedPath}`;
  }

  // @override
  async shouldLoadEntireTree(repo) {
    const isLoadingPr = await extStore.get(STORE.PR) && repo.pullNumber;
    if (isLoadingPr) {
      return true;
    }

    return false;
  }

  // @override
  getCreateTokenUrl() {
    return `${window.location.protocol}//${window.location.host}/profile/personal_access_tokens`;
  }

  // @override
  updateLayout(sidebarPinned, sidebarVisible, sidebarWidth, isSidebarLeft) {
    const shouldPushEverything = sidebarPinned && sidebarVisible;
    const direction = isSidebarLeft ? 'left' : 'right';

    $('.gitmaster_toggle')
      .css('right', sidebarVisible ? '' : -40);
    $('.side-nav-toggle, h1.title')
      .css({
        [`margin-${direction}`]: (sidebarPinned || sidebarVisible) ? '' : 36,
        [`margin-${direction === 'left' ? 'right' : 'left'}`]: '',
      });
    $('.navbar-gitlab')
      .css({
        [`margin-${direction}`]: shouldPushEverything ? sidebarWidth : '',
        [`margin-${direction === 'left' ? 'right' : 'left'}`]: '',
      });
    $('.page-with-sidebar')
      .css({
        [`padding-${direction}`]: shouldPushEverything ? sidebarWidth : '',
        [`padding-${direction === 'left' ? 'right' : 'left'}`]: '',
      });
  }

  // @override
  async getRepoFromPath(currentRepo, token, cb) {
    // 404 page, skip - GitLab doesn't have specific element for Not Found page
    if ($(document)
      .find('title')
      .text() === 'The page you\'re looking for could not be found (404)') {
      return cb();
    }

    // (username)/(reponame)[/(type)]
    // eslint-disable-next-line no-useless-escape
    const match = window.location.pathname.match(/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?/);
    if (!match) {
      return cb();
    }

    const username = match[1];
    const reponame = match[2];
    const type = match[3];

    // Not a repository, skip
    if (~GL_RESERVED_USER_NAMES.indexOf(username) ||
      ~GL_RESERVED_REPO_NAMES.indexOf(reponame) ||
      ~GL_RESERVED_TYPES.indexOf(type)) {
      return cb();
    }

    // Get branch by inspecting page, quite fragile so provide multiple fallbacks
    const GL_BRANCH_SEL_1 = '#repository_ref';
    const GL_BRANCH_SEL_2 = '.select2-container.project-refs-select.select2 .select2-chosen';
    // .nav.nav-sidebar is for versions below 8.8
    const GL_BRANCH_SEL_3 = '.nav.nav-sidebar .shortcuts-tree, .nav-links .shortcuts-tree';

    const branch =
      // Code page
      $(GL_BRANCH_SEL_1)
        .val() || $(GL_BRANCH_SEL_2)
        .text() ||
      // Non-code page
      // A space ' ' is a failover to make match() always return an array
      ($(GL_BRANCH_SEL_3)
      // eslint-disable-next-line no-useless-escape
        .attr('href') || ' ').match(/([^\/]+)/g)[3] ||
      // Assume same with previously
      (currentRepo.username === username && currentRepo.reponame === reponame && currentRepo.branch) ||
      // Default from cache
      this._defaultBranch[username + '/' + reponame];

    const repo = {
      username: username,
      reponame: reponame,
      branch: branch,
    };

    if (repo.branch) {
      cb(null, repo);
    } else {
      this._get(null, { token }, (err, data) => {
        if (err) return cb(err);
        // eslint-disable-next-line no-multi-assign
        repo.branch = this._defaultBranch[username + '/' + reponame] = data.default_branch || 'master';
        cb(null, repo);
      });
    }
  }

  // @override
  loadCodeTree(opts, cb) {
    opts.path = opts.node ? (opts.node.path || '') : '';
    this._loadCodeTreeInternal(opts, (item) => {
      item.sha = item.id;
      // item.path = item.name;
    }, cb);
  }

  // @override
  getAccessToken() {
    return window.extStore.get(window.STORE.GITLAB_TOKEN);
  }

  // @override
  selectFile(path) {
    const $pjaxContainer = $(GL_PJAX_CONTAINER_SEL);
    super.selectFile(path, {
      $pjaxContainer: $pjaxContainer,
      fragment: GL_PJAX_CONTAINER_SEL,
    });
  }

  get isOnPRPage() {
    // eslint-disable-next-line no-useless-escape
    const match = window.location.pathname.match(/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?(?:\/([^\/]+))?/);

    if (!match) return false;

    const type = match[3];

    return type === 'pull';
  }

  // @override
  _getTree(path, opts, cb) {
    this._get(`/tree?path=${path}&ref=${opts.encodedBranch}&recursive=false`, opts, cb);
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
        const tree = Object.keys(diffMap)
          .map((fileName) => {
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
    const item = tree.filter((item) => /^\.gitmodules$/i.test(item.name))[0];
    if (!item) return cb();

    this._get(`/blobs/${opts.encodedBranch}?filepath=${item.name}`, opts, (err, data) => {
      if (err) return cb(err);
      cb(null, parseGitmodules(data));
    });
  }

  _get(path, opts, cb) {
    const repo = opts.repo;
    const host = `${window.location.protocol}//${window.location.host}/api/v4`;
    const project = $('#search_project_id')
      .val() || $('#project_id')
      .val() || `${repo.username}%2f${repo.reponame}`;
    const url = `${host}/projects/${project}/repository${path || '/tree?'}&per_page=999&private_token=${opts.token}`;
    const cfg = {
      url,
      method: 'GET',
      cache: false,
    };

    $.ajax(cfg)
      .done((data) => cb(null, data))
      .fail((jqXHR) => this._handleError(cfg, jqXHR, cb));
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
        } else {
          error = 'Private repository';
          message =
            'Accessing private repositories requires access token. ' +
            'Please go to <a class="settings-btn">Settings</a> and enter a token.';
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
          message =
            'Accessing private repositories requires access token. ' +
            'Please go to <a class="settings-btn">Settings</a> and enter a token.';
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
}

export default Gitlab;
