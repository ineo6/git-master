import { browser } from 'webextension-polyfill-ts';
import { isBackgroundPage } from './util';

interface Setup<TOptions extends Options> {
  storageName?: string;
  logging?: boolean;
  defaults?: TOptions;
  /**
   * A list of functions to call when the extension is updated.
   */
  migrations?: Array<Migration<TOptions>>;
}

/**
 A map of options as strings or booleans. The keys will have to match the form fields' `name` attributes.
 */
interface Options {
  [key: string]: string | number | boolean;
}

/*
Handler signature for when an extension updates.
*/
export type Migration<TOptions extends Options> = (savedOptions: TOptions, defaults: TOptions) => void;

class OptionsSync<TOptions extends Options> {
  public static migrations = {
    /**
     Helper method that removes any option that isn't defined in the defaults. It's useful to avoid leaving old options taking up space.
     */
    removeUnused(options: Options, defaults: Options) {
      for (const key of Object.keys(options)) {
        if (!(key in defaults)) {
          delete options[key];
        }
      }
    },
  };

  storageName: string;

  defaults: TOptions;

  _migrations: Promise<void>;

  /**
   @constructor Returns an instance linked to the chosen storage.
   @param setup - Configuration for `webext-options-sync`
   */
  constructor({
    // `as` reason: https://github.com/fregante/webext-options-sync/pull/21#issuecomment-500314074
    defaults = {} as TOptions,
    storageName = 'options',
    migrations = [],
    logging = true,
  }: Setup<TOptions> = {}) {
    this.storageName = storageName;
    this.defaults = defaults;

    if (logging === false) {
      this._log = () => {
      };
    }

    this._migrations = this._runMigrations(migrations);
  }

  /**
   Retrieves all the options stored.
   @returns Promise that will resolve with **all** the options stored, as an object.
   @example
   const optionsStorage = new OptionsSync();
   const options = await optionsStorage.getAll();
   console.log('The user’s options are', options);
   if (options.color) {
		document.body.style.color = color;
	}
   */
  async getAll(): Promise<TOptions> {
    await this._migrations;
    return this._getAll();
  }

  /**
   Overrides **all** the options stored with your `options`.
   @param newOptions - A map of default options as strings or booleans. The keys will have to match the form fields' `name` attributes.
   */
  async setAll(newOptions: TOptions): Promise<void> {
    await this._migrations;
    return this._setAll(newOptions);
  }

  /**
   Merges new options with the existing stored options.
   @param newOptions - A map of default options as strings or booleans. The keys will have to match the form fields' `name` attributes.
   */
  async set(newOptions: Partial<TOptions>): Promise<void> {
    return this.setAll({ ...(await this.getAll()), ...newOptions });
  }

  private _log(method: keyof Console, ...args: any[]): void {
    console[method](...args);
  }

  private async _getAll(): Promise<any> {
    try {
      const result = await browser.storage.sync.get(this.storageName);

      return this._decode(result[this.storageName]);
    } catch (e) {
      return {};
    }
  }

  private async _setAll(newOptions: TOptions): Promise<void> {
    this._log('log', 'Saving options', newOptions);

    await browser.storage.sync.set({
      [this.storageName]: this._encode(newOptions),
    });
  }

  private _encode(options: TOptions): string {
    const thinnedOptions: Partial<TOptions> = { ...options };
    for (const [key, value] of Object.entries(thinnedOptions)) {
      if (this.defaults[key] === value) {
        delete thinnedOptions[key];
      }
    }

    this._log('log', 'Without the default values', thinnedOptions);

    return JSON.stringify(thinnedOptions);
  }

  private _decode(options: string | TOptions): TOptions {
    let decompressed = options;
    if (typeof options === 'string') {
      decompressed = JSON.parse(options);
    }

    return { ...this.defaults, ...(decompressed as TOptions) };
  }

  private async _runMigrations(migrations: Array<Migration<TOptions>>): Promise<void> {
    if (migrations.length === 0 || !isBackgroundPage()) {
      return;
    }

    const options = await this._getAll();
    const initial = JSON.stringify(options);

    this._log('log', 'Found these stored options', { ...options });
    this._log('info', 'Will run', migrations.length, migrations.length === 1 ? 'migration' : ' migrations');
    migrations.forEach(migrate => migrate(options, this.defaults));

    // Only save to storage if there were any changes
    if (initial !== JSON.stringify(options)) {
      await this._setAll(options);
    }
  }
}

export default OptionsSync;
