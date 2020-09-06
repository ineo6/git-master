import octotree from '../core.api';
import { NODE_PREFIX } from '../core.constants';
import { convertSizeToHumanReadableFormat, deXss, isSafari } from '../util.misc';

class Adapter {
  constructor(deps) {
    // deps.forEach((dep) => window[dep]());
    this._defaultBranch = {};
  }

  collectTree(tree) {
    const fileMap = {};
    tree.forEach(file => {
      // For the compatibility of gitlab V3 version
      if (!file.path && file.name) {
        file.path = file.name;
      }
      if (file.path && file.path.indexOf('/') >= 0) {
        const fileRoute = file.path.split('/');
        let deepPath = '';

        for (let i = 0; i < fileRoute.length - 1; i++) {
          deepPath += fileRoute[i];

          if (fileMap[deepPath]) {
            // eslint-disable-next-line operator-assignment
            fileMap[deepPath] = fileMap[deepPath] + 1;
          } else {
            fileMap[deepPath] = 1;
          }

          deepPath += '/';
        }
      }
    });

    return fileMap;
  }

  /**
   * Loads the code tree of a repository.
   * @param {Object} opts: {
   *                  path: the starting path to load the tree,
   *                  repo: the current repository,
   *                  node (optional): the selected node (null/false to load entire tree),
   *                  token (optional): the personal access token
   *                 }
   * @param {Function} transform(item)
   * @param {Function} cb(err: error, tree: Array[Array|item])
   * @api protected
   */
  _loadCodeTreeInternal(opts, transform, cb) {
    const folders = { '': [] };
    const { path, repo, node } = opts;

    opts.encodedBranch = opts.encodedBranch || encodeURIComponent(decodeURIComponent(repo.branch));

    this._getTree(path, opts, (err, tree) => {
      if (err) return cb(err);

      const treeMap = this.collectTree(tree);

      this._getSubmodules(tree, opts, (err, submodules) => {
        if (err) return cb(err);

        submodules = submodules || {};

        const nextChunk = async (iteration = 0) => {
          const CHUNK_SIZE = 300;

          for (let i = 0; i < CHUNK_SIZE; i++) {
            let item = tree[iteration * CHUNK_SIZE + i];

            // We're done
            if (item === undefined) {
              let treeData = folders[''];
              treeData = this._sort(treeData);
              if (!opts.node) {
                treeData = this._collapse(treeData);
              }
              return cb(null, treeData);
            }

            // Runs transform requested by subclass
            if (transform) {
              item = transform(item);
            }

            // If lazy load and has parent, prefix with parent path
            // gitlab default is lazyload
            // so gitlab url should not append parent path
            if (node && node.path) {
              if (!item.path.startsWith(`${node.path}/`)) {
                item.path = node.path + '/' + item.path;
              }
            }

            const path = item.path || '';
            const type = item.type;
            const index = path.lastIndexOf('/');
            const name = deXss(path.substring(index + 1)); // Sanitizes, closes #9
            const attr = {};

            item.id = NODE_PREFIX + path;
            item.text = name;
            item.li_attr = {
              title: path,
            };

            // Uses `type` as class name for tree node
            item.icon = type;

            // eslint-disable-next-line no-await-in-loop
            await octotree.setNodeIconAndText(this, item);

            if (item.patch) {
              item.text += `<span class="gitmaster-patch">${this.buildPatchHtml(item)}</span>`;
            }

            if (node) {
              folders[''].push(item);
            } else {
              folders[path.substring(0, index)].push(item);
            }

            if (type === 'tree' || type === 'blob') {
              if (type === 'tree') {
                if (node) {
                  item.children = true;
                } else {
                  // eslint-disable-next-line no-multi-assign
                  folders[item.path] = item.children = [];
                }

                if (treeMap[path]) {
                  attr['data-file-count'] = treeMap[path];
                }
              } else if (type === 'blob' && item.size) {
                const parsedSize = convertSizeToHumanReadableFormat(item.size, 0);
                attr['data-file-size'] = parsedSize.size + parsedSize.measure;
              }

              // If item is part of a PR, jump to that file's diff
              if (item.patch && typeof item.patch.diffId === 'number') {
                const url = this._getPatchHref(repo, item.patch);

                attr.href = url;
                attr['data-download-url'] = item.url;
                attr['data-download-filename'] = name;
              } else {
                // Encodes but retains the slashes, see #274
                const encodedPath = path
                  .split('/')
                  .map(encodeURIComponent)
                  .join('/');
                const url = this.getItemHref(repo, type, encodedPath, opts.encodedBranch);

                attr.href = url;
                attr['data-download-url'] = url;
                attr['data-download-filename'] = name;
              }
            } else if (type === 'commit') {
              let moduleUrl = submodules[item.path];

              if (moduleUrl) {
                // Fixes #105
                // Special handling for submodules hosted in GitHub
                // eslint-disable-next-line no-bitwise
                if (~moduleUrl.indexOf('github.com')) {
                  moduleUrl =
                    moduleUrl
                      .replace(/^git(:\/\/|@)/, window.location.protocol + '//')
                      .replace('github.com:', 'github.com/')
                      .replace(/.git$/, '') +
                    '/tree/' +
                    item.sha;
                  item.text = `${name} @ ${item.sha.substr(0, 7)}`;
                }

                attr.href = moduleUrl;
                attr['data-skip-pjax'] = true;
              }
            }

            item.a_attr = attr;
          }

          setTimeout(() => nextChunk(iteration + 1));
        };

        nextChunk();
      });
    });
  }

  /**
   * Generic error handler.
   * @api protected
   */
  async _handleError(settings, jqXHR, cb) {
    let error;
    let message;

    // todo gitlab gitee error handle
    switch (jqXHR.status) {
      case 0:
        error = 'Connection error';
        message = `Cannot connect to website.
          If your network connection to this website is fine, maybe there is an outage of the API.
          Please try again later.`;
        break;
      case 409:
        error = 'Empty repository';
        message = 'This repository is empty.';
        break;
      case 401:
        error = 'Invalid token';
        message = await octotree.getInvalidTokenMessage({
          responseStatus: jqXHR.status,
          requestHeaders: settings.headers,
        });
        break;
      case 404:
        error = 'Private repository';
        message =
          'Accessing private repositories requires a GitHub access token. ' + 'Please go to <a class="settings-btn">Settings</a> and enter a token.';
        break;
      case 403:
        if (jqXHR.getResponseHeader('X-RateLimit-Remaining') === '0') {
          // It's kinda specific for GitHub
          error = 'API limit exceeded';
          message =
            'You have exceeded the <a href="https://developer.github.com/v3/#rate-limiting">GitHub API rate limit</a>. ' +
            'To continue using GitMaster, you need to provide a GitHub access token. ' +
            'Please go to <a class="settings-btn">Settings</a> and enter a token.';
        } else {
          error = 'Forbidden';
          message =
            'Accessing private repositories requires a GitHub access token. ' +
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

  /**
   * Returns the CSS class to be added to the Octotree sidebar.
   * @api public
   */
  getCssClass() {
    throw new Error('Not implemented');
  }

  /**
   * Returns the minimum width acceptable for the sidebar.
   * @api protected
   */
  getMinWidth() {
    return 220;
  }

  /**
   * Inits behaviors after the sidebar is added to the DOM.
   * @api public
   */
  init($sidebar) {
    $sidebar.resizable({
      handles: 'e,w',
      minWidth: this.getMinWidth(),
    });
  }

  /**
   * Returns whether we should load the entire tree in a single request.
   * @api public
   */
  async shouldLoadEntireTree(opts) {
    return false;
  }

  /**
   * Loads the code tree.
   * @api public
   */
  loadCodeTree(opts, cb) {
    throw new Error('Not implemented');
  }

  /**
   * Returns the URL to create a personal access token.
   * @api public
   */
  getCreateTokenUrl() {
    throw new Error('Not implemented');
  }

  /**
   * Updates the layout based on sidebar visibility and width.
   * @api public
   */
  updateLayout(sidebarPinned, sidebarVisible, sidebarWidth, isSidebarLeft) {
    throw new Error('Not implemented');
  }

  /**
   * Returns repo info at the current path.
   * @api public
   */
  getRepoFromPath(token, cb) {
    throw new Error('Not implemented');
  }

  /**
   * Returns repo meta info
   * @api public
   */
  getContent(token, cb) {}

  /**
   * Selects the file at a specific path.
   * @api public
   */
  selectFile(path) {
    if (!isSafari()) {
      // Smooth scroll to diff file on PR page
      if (path.match(/#diff-\d+$/)) {
        const index = +path.split('-').slice(-1)[0];

        const matchDom = $('#files .file').eq(index);

        if (matchDom.length) {
          $('html, body').animate({ scrollTop: matchDom.offset().top - 68 }, 400);
          return;
        }
      }
    }

    window.location.href = path;
  }

  /**
   * Selects a submodule.
   * @api public
   */
  selectSubmodule(path) {
    window.location.href = path;
  }

  /**
   * Opens file or submodule in a new tab.
   * @api public
   */
  openInNewTab(path) {
    window.open(path, '_blank').focus();
  }

  /**
   * Downloads a file.
   * @api public
   */
  downloadFile(path, fileName) {
    const downloadUrl = path.replace(/\/blob\/|\/src\//, '/raw/');
    const link = document.createElement('a');

    link.setAttribute('href', downloadUrl);

    // Github will redirect to a different origin (host) for downloading the file.
    // However, the new host hasn't been added in the Content-Security-Policy header from
    // Github so the browser won't save the file, it navigates to the file instead.
    // Using '_blank' as a trick to not being navigated
    // See more about Content Security Policy at
    // https://www.html5rocks.com/en/tutorials/security/content-security-policy/
    link.setAttribute('target', '_blank');

    link.click();
  }

  /**
   * @param {HTML Text} patch
   * @param {Object} treeItem
   *
   * Return the patch Html for tree item
   */
  buildPatchHtml(treeItem = {}) {
    const { action, previous, filesChanged: files, additions, deletions } = treeItem.patch;
    let patch = '';
    patch += action === 'added' ? '<span class="text-green">added</span>' : '';
    patch += action === 'renamed' ? `<span class="text-green" title="${previous}">renamed</span>` : '';
    patch += action === 'removed' ? `<span class="text-red" title="${previous}">removed</span>` : '';
    patch += files ? `<span class='gitmaster-patch-files'>${files} ${files === 1 ? 'file' : 'files'}</span>` : '';
    patch += additions !== 0 ? `<span class="text-green">+${additions}</span>` : '';
    patch += deletions !== 0 ? `<span class="text-red">-${deletions}</span>` : '';

    return patch;
  }

  /**
   * Gets tree at path.
   * @param {Object} opts - {token, repo}
   * @api protected
   */
  _getTree(path, opts, cb) {
    throw new Error('Not implemented');
  }

  /**
   * Gets submodules in the tree.
   * @param {Object} opts - {token, repo, encodedBranch}
   * @api protected
   */
  _getSubmodules(tree, opts, cb) {
    throw new Error('Not implemented');
  }

  // Private
  getAccessToken() {
    throw new Error('Not implemented');
  }

  /**
   * Returns item's href value.
   * @api public
   */
  getItemHref(repo, type, encodedPath, encodedBranch) {
    return `/${repo.username}/${repo.reponame}/${type}/${encodedBranch}/${encodedPath}`;
  }

  /**
   * Returns patch's href value.
   * @api protected
   */
  _getPatchHref(repo, patch) {
    return `/${repo.username}/${repo.reponame}/pull/${repo.pullNumber}/files#diff-${patch.diffId}`;
  }

  _sort(folder) {
    folder.sort((a, b) => {
      // eslint-disable-next-line no-nested-ternary
      if (a.type === b.type) return a.text === b.text ? 0 : a.text < b.text ? -1 : 1;
      return a.type === 'blob' ? 1 : -1;
    });

    folder.forEach(item => {
      if (item.type === 'tree' && item.children !== true && item.children.length > 0) {
        this._sort(item.children);
      }
    });

    return folder;
  }

  _collapse(folder) {
    return folder.map(item => {
      if (item.type === 'tree') {
        item.children = this._collapse(item.children);
        if (item.children.length === 1 && item.children[0].type === 'tree' && item.a_attr) {
          const onlyChild = item.children[0];
          const path = item.a_attr['data-download-filename'];

          /**
           * Using a_attr rather than item.text to concat in order to
           * avoid the duplication of <div class="octotree-patch">
           *
           * For example:
           *
           * - item.text + onlyChild.text
           * 'src/adapters/<span class="octotree-patch">+1</span>' + 'github.js<span class="octotree-patch">+1</span>'
           *
           * - path + onlyChild.text
           * 'src/adapters/' + 'github.js<span class="octotree-patch">+1</span>'
           *
           */
          onlyChild.text = path + '/' + onlyChild.text;

          return onlyChild;
        }
      }
      return item;
    });
  }
}

export default Adapter;
