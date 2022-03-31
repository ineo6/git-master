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
  public useJsDelivr = false;

  public repo: any = {};

  public token = '';

  protected repoSize = 0;

  protected adapter: any;

  protected folderDownloadSize = 20;

  private storage: any;

  public constructor(adapter: any, storage: any) {
    this.adapter = adapter;
    this.storage = storage;

    this.repoSize = 0;
    this.useJsDelivr = false;
  }

  public async init() {
    await this.show();

    if (this.storage) {
      const options = await this.storage.getAll();

      this.useJsDelivr = !!options.useJsDelivr;
    }

    $(document).off('click', '.gm-download-file');

    $(document).on('click', '.gm-download-file', function(e) {
      e.preventDefault();
      e.stopPropagation();

      // eslint-disable-next-line @typescript-eslint/no-invalid-this
      const name = $(this).attr('download');
      // eslint-disable-next-line @typescript-eslint/no-invalid-this
      const url = $(this).attr('href');

      saveAs(url as string, name);
    });
  }

  public removeDom(selector: string) {
    if (!selector) {
      return;
    }

    [].forEach.call(document.querySelectorAll(selector), function(el) {
      // @ts-ignore
      el.parentNode.removeChild(el);
    });
  }

  public getDownloadUrl(fileInfo: any) {
    return this.resolveUrl(fileInfo.download_url, fileInfo.path);
  }

  public sortFileStructureAsOnSite(data: any[]) {
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

  public async show(): Promise<void> {
    if (this.adapter.detect.shouldEnable()) {
      await this.loadBasicData();

      this.appendRepoSizeElement();
      this.addCopyAndDownloadButton();
      this.addFileSizeAndDownloadLink();
      this.createFolderDownloadWrapper();
    }
  }

  public async downloadFolder(repo: any, targetPath?: string) {
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

  public getContentPath(targetPath?: string): string {
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

  public async batchDownload(repo: any, files: any, dir: string) {
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

  public async loadBasicData() {
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

  public sortOn(arr: any[], key: string) {
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

  public async loadRepoData(path?: string, isRepoMetaData?: boolean) {
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

  public async refreshToken() {
    const token = await this.adapter.getAccessToken();

    this.token = token;

    return token;
  }

  public abstract resolveUrl(downloadUrl: string, path: string): string;

  public abstract isSingleFile(): boolean;

  public abstract appendRepoSizeElement(): void;

  // button list
  public abstract addCopyAndDownloadButton(): Promise<void>;

  // repo main page
  public abstract addFileSizeAndDownloadLink(): Promise<void>;

  public abstract createFolderDownloadWrapper(): void;

  public abstract fetchPublicFile(file: any): Promise<ArrayBuffer>;

  public abstract fetchPrivateFile(file: any): Promise<ArrayBuffer>;
}

export default RepoInfoBase;
