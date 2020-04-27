import JSZip from 'jszip';
import saveFile from 'save-file';
import { browser } from 'webextension-polyfill-ts';
import { convertSizeToHumanReadableFormat, getFileSizeAndUnit } from '@/common/util.misc';
import { IGitHubFile } from '@/ContentScript/interfaces';

// @ts-ignore
const saveFileSync = saveFile.saveSync;

function updateStatus(_status: string) {
  // console.log(status);
}

class RepoView {
  private useJsDelivr: boolean = false;

  private repoSize: number = 0;

  private adapter: any;

  private storage: any;

  private repo: any = {};

  private folderDownloadSize: number = 20;

  private token: string = '';

  constructor(adapter: any, storage: any) {
    this.adapter = adapter;
    this.storage = storage;

    this.repoSize = 0;
    this.useJsDelivr = false;
  }

  async init() {
    await this.show();

    if (this.storage) {
      const options = await this.storage.getAll();

      this.useJsDelivr = !!options.useJsDelivr;
    }
  }

  removeDom(selector: string) {
    if (!selector) {
      return;
    }

    [].forEach.call(document.querySelectorAll(selector), function(el) {
      // @ts-ignore
      el.parentNode.removeChild(el);
    });
  }

  resolveUrl(downloadUrl: string, path: string): string {
    // use jsdelivr cdn
    if (this.repo && path && this.useJsDelivr) {
      const jsDelivrPath = `gh/${this.repo.username}/${this.repo.reponame}@${this.repo.branch}/${path}`;

      const downUrlObj = new URL(jsDelivrPath, 'https://cdn.jsdelivr.net');

      return downUrlObj.href;
    }

    return downloadUrl;
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

    let elems = $('tr.js-navigation-item');

    elems.each((_i, domItem) => {
      const item = $(domItem);

      // directory submodule file
      const fileType: string | undefined = item.find('td.icon>svg').attr('aria-label');
      const fileTitleDom = item.find('td.content .js-navigation-open');

      let fileTitle: string | undefined = fileTitleDom.length > 0 ? fileTitleDom.attr('title') : '';

      if (fileTitleDom.find('span.text-gray-light').length) {
        // some hidden dir
        fileTitle = fileTitleDom.find('span.text-gray-light').text();

        if (fileTitle.indexOf('/') === fileTitle.length - 1) {
          fileTitle = fileTitle.substring(0, fileTitle.length - 1);
        }
      }

      const matchFile = fileObj[fileTitle || ''];

      if (matchFile && fileType === 'file') {
        let formattedFileSize = getFileSizeAndUnit(matchFile);

        const downloadUrl = this.getDownloadUrl(matchFile);

        // eslint-disable-next-line max-len
        let html = `<td class="download js-enhanced-github-download-btn"
          style="width: 20px;padding-right: 10px;color: #6a737d;text-align: right;white-space: nowrap;">
            <span style="margin-right: 5px;">
              ${formattedFileSize}
            </span>
            <a href="${downloadUrl}"
             title="(Alt/Option/Ctrl + Click) to download File"
             aria-label="(Alt/Option/Ctrl + Click) to download File"
              class="tooltipped tooltipped-nw"
              download="${matchFile.name}">
              <svg class="octicon octicon-cloud-download" aria-hidden="true" height="16" version="1.1" viewBox="0 0 16 16" width="16">
                <path d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"></path>
              </svg>
            </a>
          </td>`;

        item.append(html);
      } else if (matchFile && fileType === 'directory') {
        // eslint-disable-next-line max-len
        let html = `
          <td class="download js-enhanced-github-download-btn"
          style="width: 20px;padding-right: 10px;color: #6a737d;text-align: right;white-space: nowrap;">
           <span style="margin-right: 5px;">
             Zip
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
          </td>`;
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
    let btnGroup = $('.BtnGroup.flex-shrink-0');

    if (btnGroup.length && this.adapter.detect.isSingleFile()) {
      const result = await this.loadRepoData(this.getContentPath());

      if (result) {
        let formattedFileSize = getFileSizeAndUnit(result);

        this.removeDom('.master-file-download');

        const downloadUrl = this.getDownloadUrl(result);

        let btnGroupHtml = `<a href="${downloadUrl}" download="${result.name}"
        aria-label="(Alt/Option/Ctrl + Click) to download File"
        class="master-file-download btn btn-sm BtnGroup-item file-download-button tooltipped tooltipped-s">
        <span style="margin-right: 5px;">${formattedFileSize}</span>
        <svg class="octicon octicon-cloud-download" aria-hidden="true" height="16" version="1.1" viewBox="0 0 16 16" width="16">
          <path d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"></path>
        </svg>
      </a>`;

        btnGroup.each(function(_index: number, item: HTMLElement) {
          $(item).append(btnGroupHtml);
        });
      }
    }
  }

  // repo main page
  async addFileSizeAndDownloadLink() {
    let links = document.querySelectorAll('tr.js-navigation-item > td.content a');
    let elems = document.querySelectorAll('tr.js-navigation-item > td.age');

    if (elems.length && elems.length === links.length) {
      const result = await this.loadRepoData();

      if (result) {
        this.onPathContentFetched(result);
      }
    }
  }

  appendRepoSizeElement() {
    this.removeDom('.repo-size');

    let formattedFileSize = convertSizeToHumanReadableFormat(this.repoSize * 1024); // GitHub API return size in KB for repo
    let elem = document.querySelector('ul.numbers-summary');

    if (elem) {
      let html = `
        <li class="repo-size">
          <a>
            <svg class="octicon octicon-database" aria-hidden="true" height="16" version="1.1" viewBox="0 0 12 16" width="12">
              <path d="M6 15c-3.31 0-6-.9-6-2v-2c0-.17.09-.34.21-.5.67.86 3 1.5 5.79 1.5s5.12-.64 5.79-1.5c.13.16.21.33.21.5v2c0 1.1-2.69 2-6 2zm0-4c-3.31 0-6-.9-6-2V7c0-.11.04-.21.09-.31.03-.06.07-.13.12-.19C.88 7.36 3.21 8 6 8s5.12-.64 5.79-1.5c.05.06.09.13.12.19.05.1.09.21.09.31v2c0 1.1-2.69 2-6 2zm0-4c-3.31 0-6-.9-6-2V3c0-1.1 2.69-2 6-2s6 .9 6 2v2c0 1.1-2.69 2-6 2zm0-5c-2.21 0-4 .45-4 1s1.79 1 4 1 4-.45 4-1-1.79-1-4-1z"></path>
            </svg>
            <span class="num text-emphasized">
              ${formattedFileSize.size}
            </span>
          ${formattedFileSize.measure}
          </a>
        </li>`;
      elem.insertAdjacentHTML('beforeend', html);
    }
  }

  getContentPath(targetPath?: string): string {
    // Convert /username/reponame/object_type/branch/path to path
    let path = decodeURIComponent(window.location.pathname);

    if (targetPath) {
      const targetUrl = new URL(targetPath);

      path = decodeURIComponent(targetUrl.pathname);
    }

    // eslint-disable-next-line no-useless-escape
    const match = path.match(/(?:[^\/]+\/){4}(.*)/);
    if (!match) return '';

    const currentPath = match[1];

    return currentPath;
  }

  async show() {
    if (this.adapter.detect.shouldShowOctotree()) {
      const token = await this.adapter.getAccessToken();

      const repo = await this.adapter.getRepoDataWrap(false, token);

      this.repo = repo;
      this.token = token;

      if (!this.repoSize) {
        const result = await this.loadRepoData('', true);

        if (result) {
          this.repoSize = result.size;
        } else {
          return;
        }
      }

      this.appendRepoSizeElement();
      this.addCopyAndDownloadButton();
      this.addFileSizeAndDownloadLink();
      await this.createFolderDownload(repo);
    }
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

  async batchDownload(repo: any, files: any, dir: string) {
    if (files.length === 0) {
      updateStatus('No files to download');
      return;
    }

    // @ts-ignore
    const toastKey = $.toast.init({
      title: 'GitMaster',
      content: browser.i18n.getMessage('download_folder_process'),
      type: 'info',
      delay: 0,
    });

    updateStatus(`Downloading (0/${files.length}) files…`);

    const controller = new AbortController();

    const fetchPublicFile = async (file: any) => {
      const resolvedUrl = this.resolveUrl(
        `https://raw.githubusercontent.com/${repo.username}/${repo.reponame}/${repo.branch}/${file.path}`,
        file.path
      );

      const response = await fetch(resolvedUrl, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.statusText} for ${file.path}`);
      }

      return response.blob();
    };

    function dataURItoBlob(dataURI: string) {
      // convert base64/URLEncoded data component to raw binary data held in a string
      let byteString;
      if (dataURI.split(',')[0].indexOf('base64') >= 0) byteString = atob(dataURI.split(',')[1]);
      else byteString = unescape(dataURI.split(',')[1]);

      // separate out the mime component
      let mimeString = dataURI
        .split(',')[0]
        .split(':')[1]
        .split(';')[0];

      // write the bytes of the string to a typed array
      let ia = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      return new Blob([ia], { type: mimeString });
    }

    const fetchPrivateFile = async (file: any) => {
      const response = await fetch(file.url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.statusText} for ${file.path}`);
      }

      const { content } = await response.json();

      const dataUrl = `data:application/octet-stream;base64,${content}`;

      return dataURItoBlob(dataUrl);
    };

    let downloaded = 0;
    const zip = new JSZip();

    const download = async (file: any) => {
      let blob: unknown;

      try {
        if (window.RepoMeta.private) {
          blob = await fetchPrivateFile(file);
        } else {
          blob = await fetchPublicFile(file);
        }

        downloaded++;
        updateStatus(`Downloading (${downloaded}/${files.length}) files…`);

        zip.file(file.path.replace(dir + '/', ''), blob, {
          binary: true,
        });
      } catch (e) {
        updateStatus(`Download ${file.path} failed`);
      }
    };

    await Promise.all(files.map(download));

    updateStatus(`Zipping ${downloaded} files…`);

    const zipBlob = await zip.generateAsync({
      type: 'blob',
    });

    await saveFileSync(zipBlob, `${repo.username} ${repo.reponame} ${repo.branch} ${dir}.zip`.replace(/\//, '-'));
    // @ts-ignore
    $.toast.remove(toastKey);
    updateStatus(`Downloaded ${downloaded} files! Done!`);
  }

  async refreshToken() {
    const token = await this.adapter.getAccessToken();

    this.token = token;

    return token;
  }

  async downloadFolder(repo: any, targetPath?: string) {
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

  async createFolderDownload(repo: any) {
    const buttonGroup = $('.file-navigation .BtnGroup.float-right');

    const downloadBtn = $('<a class="btn btn-sm BtnGroup-item">Download </a>');

    downloadBtn.on('click', () => {
      this.downloadFolder(repo);
    });

    if (buttonGroup) {
      buttonGroup.prepend(downloadBtn);
    }
  }
}

export default RepoView;
