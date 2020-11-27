import { browser } from 'webextension-polyfill-ts';
import { DEFAULTS, EVENT, STORE } from './core.constants';
import { isSafari, promisify } from './util.misc';

function _parse(val) {
  try {
    return JSON.parse(val);
  } catch (_) {
    return val;
  }
}

class ExtStore {
  constructor(values, defaults) {
    this._isSafari = process.env.TARGET_BROWSER === 'safari';

    this._tempChanges = {};

    this._setInExtensionStorage = this.storageSetWrap(browser.storage.local.set);
    this._getInExtensionStorage = browser.storage.local.get;
    this._removeInExtensionStorage = browser.storage.local.remove;

    // Initialize default values
    this._init = Promise.all(
      Object.keys(values).map(async key => {
        const existingVal = await this._innerGet(values[key]);
        if (existingVal == null) {
          await this._innerSet(values[key], defaults[key]);
        }
      })
    ).then(() => {
      this._init = null;
      this._setupOnChangeEvent();
    });
  }

  storageSetWrap(fn) {
    return function(obj) {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise(async resolve => {
        fn(obj).then(() => {
          resolve();

          if (this._isSafari) {
            // should notify in safari
            // browser.storage.onChanged.addListener not work in safari 14
            const entries = Object.entries(obj);

            if (entries.length > 0) {
              const [key, newValue] = entries[0];
              try {
                if (!this._init) {
                  this._getInExtensionStorage(key).then(savedValue => {
                    const oldValue = savedValue[key];

                    this._notifyChange(key, oldValue, newValue);
                  });
                }
              } catch (e) {
                const msg =
                  'GitMaster cannot save its settings. ' + 'If the local storage for this domain is full, please clean it up and try again.';
                console.error(msg, e);
              }
            }
          }
        });
      });
    };
  }

  _setupOnChangeEvent() {
    window.addEventListener('storage', evt => {
      if (this.isMyStorageKey(evt.key)) {
        this._notifyChange(evt.key, _parse(evt.oldValue), _parse(evt.newValue));
      }
    });

    browser.storage.onChanged.addListener(changes => {
      Object.entries(changes).forEach(([key, change]) => {
        if (this.isMyStorageKey(key)) {
          this._notifyChange(key, change.oldValue, change.newValue);
        }
      });
    });
  }

  isMyStorageKey(key) {
    return key.startsWith('gitmaster');
  }

  // Debounce and group the trigger of EVENT.STORE_CHANGE because the
  // changes are all made one by one
  _notifyChange(key, oldVal, newVal) {
    this._tempTimer && clearTimeout(this._tempTimer);
    this._tempChanges[key] = [oldVal, newVal];
    this._tempTimer = setTimeout(() => {
      $(this).trigger(EVENT.STORE_CHANGE, this._tempChanges);
      this._tempTimer = null;
      this._tempChanges = {};
    }, 50);
  }

  // Public
  async set(key, value) {
    if (this._init) await this._init;
    return this._innerSet(key, value);
  }

  async get(key) {
    if (this._init) await this._init;
    return this._innerGet(key);
  }

  async remove(key) {
    if (this._init) await this._init;
    return this._innerRemove(key);
  }

  async setIfNull(key, val) {
    const existingVal = await this.get(key);
    if (existingVal == null) {
      await this.set(key, val);
    }
  }

  // Private
  async _innerGet(key) {
    const result = key.endsWith('local') ? await this._getLocal(key) : await this._getInExtensionStorage(key);

    return result ? result[key] : '';
  }

  _innerSet(key, value) {
    const payload = { [key]: value };
    return key.endsWith('local') ? this._setLocal(payload) : this._setInExtensionStorage(payload);
  }

  _innerRemove(key) {
    return key.endsWith('local') ? this._removeLocal(key) : this._removeInExtensionStorage(key);
  }

  _getLocal(key) {
    return new Promise(resolve => {
      const value = _parse(localStorage.getItem(key));
      resolve({ [key]: value });
    });
  }

  _setLocal(obj) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async resolve => {
      const entries = Object.entries(obj);

      if (entries.length > 0) {
        const [key, newValue] = entries[0];
        try {
          const value = JSON.stringify(newValue);
          if (!this._init) {
            // Need to notify the changes programmatically since window.onstorage event only
            // get triggerred if the changes are from other tabs
            const oldValue = (await this._getLocal(key))[key];
            this._notifyChange(key, oldValue, newValue);
          }
          localStorage.setItem(key, value);
        } catch (e) {
          const msg = 'GitMaster cannot save its settings. ' + 'If the local storage for this domain is full, please clean it up and try again.';
          console.error(msg, e);
        }
        resolve();
      }
    });
  }

  _removeLocal(key) {
    return new Promise(resolve => {
      localStorage.removeItem(key);
      resolve();
    });
  }
}

const store = new ExtStore(STORE, DEFAULTS);
window.extStore = store;

export default store;
