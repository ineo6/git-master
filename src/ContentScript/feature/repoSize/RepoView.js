import { browser } from 'webextension-polyfill-ts';
import Clipboard from 'clipboard';
import { convertSizeToHumanReadableFormat, getFileSizeAndUnit } from '../../../common/util.misc';
import { MessageType } from '../../../common/core.constants';

class RepoView {
  constructor(adapter, options) {
    this.adapter = adapter;
    this.options = options;

    this.repoSize = 0;
    this.useJsDelivr = false;

    browser.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
      if (request && request.type === MessageType.PAGE_RENDERED) {
        setTimeout(() => {
          this.show();
        }, 10);
      }
    });
  }

  async init() {
    await this.show();

    if (this.options) {
      this.useJsDelivr = !!this.options.useJsDelivr;
    }
  }

  removeDom(selector) {
    if (!selector) {
      return;
    }

    [].forEach.call(document.querySelectorAll(selector), function(el) {
      el.parentNode.removeChild(el);
    });
  }

  getDownloadUrl(fileInfo) {
    let downUrl = fileInfo.download_url;

    // use jsdelivr cdn
    if (this.repo && fileInfo && this.useJsDelivr) {
      const path = `gh/${this.repo.username}/${this.repo.reponame}@${this.repo.branch}/${fileInfo.path}`;

      const downUrlObj = new URL(path, 'https://cdn.jsdelivr.net');

      downUrl = downUrlObj.href;
    }

    return downUrl;
  }

  onPathContentFetchedForBtns(data) {
    let formattedFileSize = getFileSizeAndUnit(data);

    this.removeDom('.master-file-clipboard');
    this.removeDom('.master-file-download');

    const downloadUrl = this.getDownloadUrl(data);

    let btnGroupHtml = `
      <button aria-label="Copy file contents to clipboard" class="master-file-clipboard btn btn-sm BtnGroup-item file-clipboard-button tooltipped tooltipped-s js-enhanced-github-copy-btn" data-copied-hint="Copied!" type="button" click="selectText()" data-clipboard-target="tbody">
        Copy File
      </button>
      <a href="${downloadUrl}" download="${data.name}"
        aria-label="(Alt/Option/Ctrl + Click) to download File" class="master-file-download btn btn-sm BtnGroup-item file-download-button tooltipped tooltipped-s">
        <span style="margin-right: 5px;">${formattedFileSize}</span>
        <svg class="octicon octicon-cloud-download" aria-hidden="true" height="16" version="1.1" viewBox="0 0 16 16" width="16">
          <path d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"></path>
        </svg>
      </a>`;

    let btnGroup = document.querySelectorAll('.BtnGroup:not(.d-md-none)')[0];

    btnGroup.insertAdjacentHTML('beforeend', btnGroupHtml);
  }

  sortOn(arr, key) {
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

  sortFileStructureAsOnSite(data) {
    if (!data || Object.prototype.toString.call(data) !== '[object Array]') {
      return;
    }

    let folders = [];
    let files = [];
    let others = [];
    let dataAfterSorting = [];

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

  onPathContentFetched(data = []) {
    data = this.sortFileStructureAsOnSite(data);

    if (!data) {
      return;
    }

    this.removeDom('.download'); // remove before adding new ones

    let uptree = document.querySelectorAll('tr.up-tree > td');
    let isAnyFilePresent = false;

    for (let i = 0; i < data.length; i++) {
      if (data[i].type === 'file') {
        isAnyFilePresent = true;
        break;
      }
    }

    if (!isAnyFilePresent) {
      return;
    }

    if (uptree && uptree[3]) {
      uptree[3].insertAdjacentHTML('afterend', '<td class="download"></td>');
    }

    let elems = document.querySelectorAll('tr.js-navigation-item > td.age');

    for (let i = 0; i < elems.length; i++) {
      if (data[i].type === 'file') {
        let formattedFileSize = getFileSizeAndUnit(data[i]);

        const downloadUrl = this.getDownloadUrl(data[i]);

        // eslint-disable-next-line max-len
        let html = `
          <td class="download js-enhanced-github-download-btn" 
          style="width: 20px;padding-right: 10px;color: #6a737d;text-align: right;white-space: nowrap;">
            <span style="margin-right: 5px;">
              ${formattedFileSize}
            </span>
            <a href="${downloadUrl}"
             title="(Alt/Option/Ctrl + Click) to download File" 
             aria-label="(Alt/Option/Ctrl + Click) to download File"
              class="tooltipped tooltipped-nw"
              download="${data[i].name}">
              <svg class="octicon octicon-cloud-download" aria-hidden="true" height="16" version="1.1" viewBox="0 0 16 16" width="16">
                <path d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"></path>
              </svg>
            </a>
          </td>`;
        elems[i].insertAdjacentHTML('afterend', html);
      } else {
        elems[i].insertAdjacentHTML('afterend', '<td class="download"></td>');
      }
    }
  }

  // button list
  async addCopyAndDownloadButton() {
    let btnGroup = document.querySelectorAll('.BtnGroup:not(.d-md-none)')[0];

    if (btnGroup && window.location.href && window.location.href.indexOf('blob/') > -1) {
      // instantiate copy to clipborad
      new Clipboard('.master-file-clipboard'); // eslint-disable-line no-new

      const result = await this.loadRepoData(this.getContentPath());

      if (result) {
        this.onPathContentFetchedForBtns(result);
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

  getContentPath() {
    // Convert /username/reponame/object_type/branch/path to path
    const path = decodeURIComponent(window.location.pathname);
    // eslint-disable-next-line no-useless-escape
    const match = path.match(/(?:[^\/]+\/){4}(.*)/);
    if (!match) return;

    const currentPath = match[1];

    return currentPath;
  }

  async show() {
    const token = await this.adapter.getAccessToken();

    const repo = await this.adapter.getRepoDataWrap(false, token);

    this.repo = repo;

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
  }

  async loadRepoData(path, isRepoMetaData) {
    const data = await this.adapter.getContent(path, {
      repo: this.repo,
      isRepoMetaData,
    });

    return data;
  }
}

export default RepoView;
