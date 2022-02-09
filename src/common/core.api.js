import FileIcons from '@ineo6/file-icons';
import { STORE } from './core.constants';
import extStore from './core.storage';

class GitMasterService {
  constructor() {
    this.reset();
  }

  // Hooks
  activate(inputs, opts) {}

  applyOptions(opts) {
    return false;
  }

  // Public
  load(loadFn) {
    loadFn();
  }

  reset() {
    this.getAccessToken = this._getAccessToken;
    this.getInvalidTokenMessage = this._getInvalidTokenMessage;
    this.setNodeIconAndText = this._setNodeIconAndText;
  }

  // Private
  _getAccessToken() {
    return window.extStore.get(STORE.GITHUB_TOKEN);
  }

  _getInvalidTokenMessage({ responseStatus, requestHeaders }) {
    return 'The access token is invalid. Please go to <a class="settings-btn">Settings</a> and update the token.';
  }

  async _setNodeIconAndText(context, item) {
    if (item.type === 'blob') {
      if (await extStore.get(STORE.ICONS)) {
        const className = FileIcons.getClass(item.text);
        item.icon += ' ' + (className || 'default-icon');
      } else {
        item.icon += ' default-icon';
      }
    }
  }
}

window.gitMaster = new GitMasterService();
export default new GitMasterService();
