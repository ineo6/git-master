import JSZip from 'jszip';
import saveFile from 'save-file';
import { browser } from 'webextension-polyfill-ts';
import saveAs from '@/common/fileSave';

// @ts-ignore
const saveFileSync = saveFile.saveSync;

function updateStatus(_status: string) {
  // console.log(_status);
}

abstract class RepoInfoBase {
  public useJsDelivr: boolean = false;

  protected repoSize: number = 0;

  protected adapter: any;

  private storage: any;

  public repo: any = {};

  protected folderDownloadSize: number = 20;

  public token: string = '';

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

    $(document).on('click', '.gm-download-file', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const name = $(this).attr('download');
      const url = $(this).attr('href');

      saveAs(url as string, name);
    });
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

  abstract resolveUrl(downloadUrl: string, path: string): string;

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

  abstract isSingleFile(): boolean;

  abstract appendRepoSizeElement(): void;

  // button list
  abstract async addCopyAndDownloadButton(): Promise<void>;

  // repo main page
  abstract async addFileSizeAndDownloadLink(): Promise<void>;

  abstract createFolderDownloadWrapper(): void;

  async loadBasicData() {
    const token = await this.adapter.getAccessToken();

    const repo = await this.adapter.getRepoDataWrap(false, token);

    this.repo = repo;
    this.token = token;

    if (!this.repoSize) {
      const result = await this.loadRepoData('', true);

      if (result) {
        this.repoSize = result.size;
      }
    }
  }

  async show(): Promise<void> {
    if (this.adapter.detect.shouldEnable()) {
      await this.loadBasicData();

      this.appendRepoSizeElement();
      this.addCopyAndDownloadButton();
      this.addFileSizeAndDownloadLink();
      this.createFolderDownloadWrapper();
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

  abstract async fetchPublicFile(file: any): Promise<ArrayBuffer>;

  abstract async fetchPrivateFile(file: any): Promise<ArrayBuffer>;

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

    let downloaded = 0;
    const zip = new JSZip();

    const download = async (file: any) => {
      let blob: unknown;

      try {
        if (window.RepoMeta.private) {
          blob = await this.fetchPrivateFile(file);
        } else {
          blob = await this.fetchPublicFile(file);
        }

        downloaded++;
        updateStatus(`Downloading (${downloaded}/${files.length}) files…`);
        // @ts-ignore

        zip.file(file.path.replace(dir + '/', ''), blob);
      } catch (e) {
        updateStatus(`Download ${file.path} failed`);
      }
    };

    await Promise.all(files.map(download));

    updateStatus(`Zipping ${downloaded} files…`);

    try {
      const zipBlob = await zip.generateAsync({
        type: 'blob',
      });

      await saveFileSync(zipBlob, `${repo.username} ${repo.reponame} ${repo.branch} ${dir}.zip`.replace(/\//, '-'));
      // @ts-ignore
      $.toast.remove(toastKey);
      updateStatus(`Downloaded ${downloaded} files! Done!`);
    } catch (e) {
      console.error(e);
    }
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
}

export default RepoInfoBase;
