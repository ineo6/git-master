import 'jstree';
import './util.plugins';
import { EVENT, NODE_PREFIX, DICT } from './core.constants';
import { deXss } from './util.misc';

class TreeView {
  constructor($dom, adapter) {
    this.adapter = adapter;
    this.$view = $dom.find('.gitmaster-tree-view');
    this.$tree = this.$view
      .find('.gitmaster-view-body')
      .on('click.jstree', '.jstree-open>a', ({ target }) => {
        setTimeout(() => this.$jstree.close_node(target));
      })
      .on('click.jstree', '.jstree-closed>a', ({ target }) => {
        setTimeout(() => this.$jstree.open_node(target));
      })
      .on('click', this._onItemClick.bind(this))
      .jstree({
        core: {
          multiple: false,
          animation: 50,
          worker: false,
          themes: { responsive: false },
        },
        plugins: ['wholerow', 'search', 'truncate'],
      });

    this.$search = $dom.find('.jstree-search-input').bind('input propertychange', this.search);
  }

  get $jstree() {
    return this.$tree.jstree(true);
  }

  focus() {
    this.$jstree.get_container().focus();
  }

  show(repo, token) {
    const $jstree = this.$jstree;

    $jstree.settings.core.data = (node, cb) => {
      // This function does not accept an async function as its value
      // Thus, we use an async anonymous function inside to fix it
      (async () => {
        const startTime = Date.now();
        const loadAll = await this.adapter.shouldLoadEntireTree(repo);
        node = !loadAll && (node.id === '#' ? { path: '' } : node.original);

        this.adapter.loadCodeTree(
          {
            repo,
            token,
            node,
          },
          (err, treeData) => {
            if (err) {
              if (err.status === 206 && loadAll) {
                // The repo is too big to load all, need to retry
                $jstree.refresh(true);
              } else {
                $(this).trigger(EVENT.FETCH_ERROR, [err]);
              }
              return;
            }

            cb(treeData);
            $(document).trigger(EVENT.REPO_LOADED, {
              repo,
              loadAll,
              duration: Date.now() - startTime,
            });
          }
        );
      })();
    };

    this.$tree.one('refresh.jstree', async () => {
      await this.syncSelection(repo);
      $(this).trigger(EVENT.VIEW_READY);
    });

    this._showHeader(repo);
    $jstree.refresh(true);
  }

  search = e => {
    this.$jstree.search(e.target.value || '', false, true);
  };

  _showHeader(repo) {
    const adapter = this.adapter;

    this.$view
      .find('.gitmaster-view-header')
      .html(
        `<div class="gitmaster-header-summary">
          <div class="gitmaster-header-repo">
            <i class="gitmaster-icon-repo"></i>
            <a href="/${repo.username}">${repo.username}</a> /
            <a data-pjax href="/${repo.username}/${repo.reponame}">${repo.reponame}</a>
          </div>
          <div class="gitmaster-header-branch">
            <i class="gitmaster-icon-branch"></i>
            ${deXss((repo.displayBranch || repo.branch).toString())}
          </div>
        </div>`
      )
      .on('click', 'a[data-pjax]', function(event) {
        event.preventDefault();
        // A.href always return absolute URL, don't want that
        const href = $(this).attr('href');
        const newTab = event.shiftKey || event.ctrlKey || event.metaKey;
        newTab ? adapter.openInNewTab(href) : adapter.selectFile(href);
      });
  }

  /**
   * Intercept the _onItemClick method
   * return true to stop the current execution
   * @param {Event} event
   */
  onItemClick(event) {
    return false;
  }

  _onItemClick(event) {
    let $target = $(event.target);

    let download = false;

    // Handle middle click
    if (event.which === 2) return;

    if (this.onItemClick(event)) return;

    if ($target.is('i.jstree-icon')) {
      $target = $target.parent();
      download = true;
    } else if (!$target.is('a.jstree-anchor')) {
      $target = $target.closest('a.jstree-anchor');
    }

    $target = $target.is('a.jstree-anchor') ? $target : $target.parent();

    if ($target.is('.gitmaster-patch')) {
      $target = $target.parent();
    }

    if (!$target.is('a.jstree-anchor')) return;

    // Refocus after complete so that keyboard navigation works, fix #158
    const refocusAfterCompletion = () => {
      $(document).one('pjax:success page:load', () => {
        this.$jstree.get_container().focus();
      });
    };

    const adapter = this.adapter;
    const newTab = event.shiftKey || event.ctrlKey || event.metaKey;
    const href = $target.attr('href');
    // The 2nd path is for submodule child links
    const targetInner = $target.find('.jstree-anchor-inner');
    const $icon = targetInner.children().length ? targetInner.children(':first') : targetInner.siblings(':first');

    if ($icon.hasClass('commit')) {
      refocusAfterCompletion();
      newTab ? adapter.openInNewTab(href) : adapter.selectSubmodule(href);
    } else if ($icon.hasClass('blob')) {
      if (download) {
        const downloadUrl = $target.attr('data-download-url');
        const downloadFileName = $target.attr('data-download-filename');
        adapter.downloadFile(downloadUrl, downloadFileName);
      } else {
        refocusAfterCompletion();
        newTab ? adapter.openInNewTab(href) : adapter.selectFile(href);
      }
    }
  }

  // Convert ['a/b'] to ['a', 'a/b']
  breakPath(fullPath) {
    return fullPath.split('/').reduce((res, path, idx) => {
      res.push(idx === 0 ? path : `${res[idx - 1]}/${path}`);
      return res;
    }, []);
  }

  parserGitLabRepoPath(path) {
    const match = path.match(/(?:[^/]+\/)+blob\/(?:[^/]+\/)(.*)/);

    if (match && match.length === 2) {
      return match[1];
    }

    return '';
  }

  parserGiteeRepoPath(path) {
    const match = path.match(/(?:[^/]+\/)+branch\/(?:[^/]+\/)(.*)/);

    if (match && match.length === 2) {
      return match[1];
    }

    return '';
  }

  parserRepoPath(path) {
    const match = path.match(/(?:[^/]+\/){4}(.*)/);

    if (match && match.length === 2) {
      return match[1];
    }

    return '';
  }

  getCurrentFilePath() {
    const path = decodeURIComponent(window.location.pathname);

    if (this.adapter.whoami() === DICT.GITLAB) {
      return this.parserGitLabRepoPath(path);
    } else if (this.adapter.whoami() === DICT.GITEA) {
      return this.parserGiteeRepoPath(path);
    }

    return this.parserRepoPath(path);
  }

  async syncSelection(repo) {
    const $jstree = this.$jstree;
    if (!$jstree) return;

    const currentPath = this.getCurrentFilePath();

    if (currentPath === '') {
      return;
    }

    const loadAll = await this.adapter.shouldLoadEntireTree(repo);

    this.selectPath(loadAll ? [currentPath] : this.breakPath(currentPath));
  }

  selectPath(paths, index = 0) {
    const nodeId = NODE_PREFIX + paths[index];

    const $jstree = this.$jstree;

    if ($jstree.get_node(nodeId)) {
      $jstree.deselect_all();
      $jstree.select_node(nodeId);
      $jstree.open_node(nodeId, () => {
        if (++index < paths.length) {
          this.selectPath(paths, index);
        }
      });
    }
  }
}

export default TreeView;
