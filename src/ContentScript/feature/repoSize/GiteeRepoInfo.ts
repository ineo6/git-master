import { browser } from 'webextension-polyfill-ts';
import { getFileSizeAndUnit } from '@/common/util.misc';
import { IGitHubFile } from '@/ContentScript/interfaces';
import { getFileIcon } from '@/ContentScript/util';
import RepoInfoBase from './RepoInfoBase';
import { dataURItoArraybuffer, report } from '../util';

class GiteeRepoInfo extends RepoInfoBase {
  removeDom(selector: string) {
    if (!selector) {
      return;
    }

    [].forEach.call(document.querySelectorAll(selector), function(el) {
      // @ts-ignore
      el.parentNode.removeChild(el);
    });
  }

  resolveUrl(_downloadUrl: string, path: string): string {
    // todo 如果是私有仓库
    if (this.repo && path) {
      const jsDelivrPath = `${this.repo.username}/${this.repo.reponame}/raw/${this.repo.branch}/${path}`;

      const downUrlObj = new URL(jsDelivrPath, 'https://gitee.com');

      return downUrlObj.href;
    }

    return '';
  }

  getDownloadUrl(fileInfo: any) {
    return this.resolveUrl(fileInfo.download_url, fileInfo.path);
  }

  sortOn(arr: any[], key: string) {
    return arr.sort(function(a, b) {
      if (a[key] < b[key]) {
        return -1;
      }
      if (a[key] > b[key]) {
        return 1;
      }
      return 0;
    });
  }

  sortFileStructureAsOnSite(data: any[]) {
    if (!data || Object.prototype.toString.call(data) !== '[object Array]') {
      return;
    }

    let folders: any[] = [];
    let files: any[] = [];
    let others: any[] = [];
    let dataAfterSorting: any[] = [];

    data.forEach(function(item) {
      if (item.type === 'dir') {
        folders.push(item);
      } else if (item.type === 'file') {
        files.push(item);
      } else {
        others.push(item);
      }
    });

    folders = this.sortOn(folders, 'name');
    files = this.sortOn(files, 'name');
    others = this.sortOn(others, 'name');

    dataAfterSorting = dataAfterSorting
      .concat(folders)
      .concat(files)
      .concat(others);
    return dataAfterSorting;
  }

  onPathContentFetched(fileList: IGitHubFile[] = []) {
    // @ts-ignore
    fileList = this.sortFileStructureAsOnSite(fileList);

    if (!fileList) {
      return;
    }

    this.removeDom('.download'); // remove before adding new ones

    let isAnyFilePresent = false;

    const fileObj: { [key: string]: IGitHubFile } = {};

    fileList.forEach((file: IGitHubFile) => {
      if (file.type === 'file' || file.type === 'dir') {
        isAnyFilePresent = true;
      }

      fileObj[file.name] = file;
    });

    if (!isAnyFilePresent) {
      return;
    }

    let elems = $('.row.tree-item');
    const fileListParent = elems.parent();

    fileListParent.addClass('file-icons-wrapper');

    elems.each((_i, domItem) => {
      const item = $(domItem);

      // directory submodule file
      const fileIcon = item.find('.iconfont');
      const fileTitleDom = item.find('.tree-list-item a');

      let fileType = '';

      const matches = /icon-\w+/.exec(fileIcon.attr('class') || '');

      if (matches) {
        fileType = matches[0];
      }

      let fileTitle: string | undefined = fileTitleDom.length > 0 ? fileTitleDom.attr('title') : '';

      const matchFile = fileObj[fileTitle || ''];

      const commitInfo = item.find('.tree_author');

      commitInfo.removeClass('nine wide').addClass('seven wide');

      if (matchFile && fileType === 'icon-file') {
        const downloadUrl = this.getDownloadUrl(matchFile);

        if (fileTitle) {
          getFileIcon(fileTitle).then((ext: string) => {
            fileIcon.replaceWith(`<i class="gm-navigation-item-icon ${ext}" role="presentation"></i>`);
          });
        }

        // eslint-disable-next-line max-len
        let html = `<div class="two wide column tree_download download tree-file-download-btn"
          style="padding-right: 10px;color: #6a737d;text-align: right;white-space: nowrap;">
            <span style="margin-right: 5px;">
            </span>
            <a href="${downloadUrl}"
            class="gm-download-file"
             title="Download File"
             aria-label="Download File"
              download="${matchFile.name}">
              <svg class="octicon octicon-cloud-download" aria-hidden="true" height="16" version="1.1" viewBox="0 0 16 16" width="16">
                <path d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"></path>
              </svg>
            </a>
          </div>`;

        item.append(html);
      } else if (matchFile && fileType === 'icon-folders') {
        fileIcon.replaceWith('<i class="gm-navigation-item-icon gm-folder-icon" role="presentation"></i>');

        // eslint-disable-next-line max-len
        let html = `
          <div class="two wide column tree_download download tree-file-download-btn"
          style="padding-right: 10px;color: #6a737d;text-align: right;white-space: nowrap;">
           <span style="margin-right: 5px;">
            </span>
            <a
             title="Download Folder"
             aria-label="Download Folder"
             class="tooltipped tooltipped-nw gm-download-folder"
             style="cursor:pointer;"
             data-htmlUrl="${matchFile.html_url}"
             >
              <svg class="octicon octicon-cloud-download" aria-hidden="true" height="16" version="1.1" viewBox="0 0 16 16" width="16">
                <path d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"></path>
              </svg>
            </a>
          </div>`;
        item.append(html);
      } else {
        item.append('<td class="download"></td>');
      }
    });

    const repoCtx = this;

    $('.gm-download-folder').on('click', function() {
      const dataSet = this.dataset;
      repoCtx.downloadFolder(repoCtx.repo, dataSet.htmlurl);
    });
  }

  // button list
  async addCopyAndDownloadButton() {
    const target = $('.blob-header-title .buttons');

    this.removeDom('.master-file-download');

    if (target && this.adapter.detect.isFile()) {
      const result = await this.loadRepoData(this.getContentPath());

      if (result) {
        let formattedFileSize = getFileSizeAndUnit(result);

        const downloadUrl = this.getDownloadUrl(result);

        let btnGroupHtml = `<a href="${downloadUrl}" download=""
        aria-label="Download File"
        title="Download File"
        class="master-file-download ui button gm-download-file"
        style="border-right: 1px solid rgba(39,41,43,0.15);">
        <span style="margin-right: 5px;">${formattedFileSize}</span>
        <svg style="vertical-align: middle;" aria-hidden="true" height="16" version="1.1" viewBox="0 0 16 16" width="16">
          <path d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"></path>
        </svg>
      </a>`;

        target.prepend(btnGroupHtml);
      }
    }
  }

  // repo main page
  async addFileSizeAndDownloadLink() {
    let links = document.querySelectorAll('.row.tree-item > .tree-item-file-name.tree-list-item');
    let elems = document.querySelectorAll('.row.tree-item > .tree_time_ago');

    if (elems.length && elems.length === links.length) {
      const result = await this.loadRepoData(this.getContentPath());

      if (result) {
        this.onPathContentFetched(result);
      }
    }
  }

  getTree(path: string, token: string) {
    return new Promise((resolve, reject) => {
      this.adapter._getTree(
        this.repo.branch + '/' + path,
        {
          repo: this.repo,
          token,
        },
        function(err: any, result: IGitHubFile[]) {
          if (err) {
            reject();
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  async loadRepoData(path?: string, isRepoMetaData?: boolean) {
    try {
      const data = await this.adapter.getContent(path, {
        repo: this.repo,
        isRepoMetaData,
      });

      return data;
    } catch (e) {
      return false;
    }
  }

  async fetchPrivateFile(file: any) {
    const response = await fetch(file.url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.statusText} for ${file.path}`);
    }

    const { content } = await response.json();

    const dataUrl = `data:application/octet-stream;base64,${content}`;

    return dataURItoArraybuffer(dataUrl);
  }

  async fetchPublicFile(file: any) {
    const resolvedUrl = this.resolveUrl(
      `https:///gitee.com/${this.repo.username}/${this.repo.reponame}/raw/${this.repo.branch}/${file.path}`,
      file.path
    );

    const response = await fetch(resolvedUrl, {});

    if (!response.ok) {
      throw new Error(`HTTP ${response.statusText} for ${file.path}`);
    }

    return response.arrayBuffer();
  }

  async refreshToken() {
    const token = await this.adapter.getAccessToken();

    this.token = token;

    return token;
  }

  async downloadFolder(repo: any, targetPath?: string) {
    report.send(report.event.FOLDER_DOWNLOAD, { action: 'gitee' });

    const encodedBranch = encodeURIComponent(decodeURIComponent(repo.branch));
    const path = encodedBranch + '?recursive=1';

    // @ts-ignore
    const fetchInfoToastKey = $.toast.init({
      title: 'GitMaster',
      content: browser.i18n.getMessage('download_folder_fetch'),
      type: 'info',
      delay: 0,
    });

    const token = await this.refreshToken();

    this.adapter._getTree(
      path,
      {
        repo,
        token,
      },
      (_error: any, result: any) => {
        // @ts-ignore
        $.toast.remove(fetchInfoToastKey);

        if (result) {
          let directory = this.getContentPath(targetPath);
          if (!directory) return;

          if (!directory.endsWith('/')) {
            directory += '/';
          }

          const files = [];

          for (const item of result) {
            if (item.type === 'blob' && item.path.startsWith(directory)) {
              files.push(item);
            }
          }

          if (files.length <= this.folderDownloadSize) {
            this.batchDownload(repo, files, directory);
          } else {
            alert(browser.i18n.getMessage('download_folder_notify'));
          }
        }
      }
    );
  }

  isSingleFile(): boolean {
    return false;
  }

  createFolderDownloadWrapper(): void {
    const target = this.createFolderDownload();

    this.removeDom('.master-download-folder');

    if (target && this.adapter.detect.isFolder()) {
      const downloadBtn = $(`
      <div class="ui button blue master-download-folder">目录下载</div>`);

      downloadBtn.on('click', async () => {
        await this.downloadFolder(this.repo);
      });

      target.prepend(downloadBtn);
    }
  }

  createFolderDownload(): JQuery {
    return $('#git-project-bread .git-project-right-actions.float-right');
  }

  async show(): Promise<void> {
    if (this.adapter.detect.shouldEnable()) {
      await this.loadBasicData();

      this.addCopyAndDownloadButton();
      this.addFileSizeAndDownloadLink();
      this.createFolderDownloadWrapper();
    }
  }

  appendRepoSizeElement(): void {}
}

export default GiteeRepoInfo;
