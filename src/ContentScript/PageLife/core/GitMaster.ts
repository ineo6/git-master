import { EventEmitter2 } from 'eventemitter2';
import get from 'lodash.get';
import set from 'lodash.set';
import unset from 'lodash.unset';
import Lifecycle from './Lifecycle';
import LifecyclePlugins from '../lib/LifecyclePlugins';
import PluginLoader from '../lib/PluginLoader';
import Logger from '../lib/Logger';
import Storage from '../lib/Storage';
import { Config, Helper } from '../../interfaces';
import { EVENT } from '@/common/core.constants';

// @ts-ignore
function bind(obj: any, eventStr: string, callback: Function) {
  if (obj.addEventListener) {
    // 大部分浏览器兼容方式
    obj.addEventListener(eventStr, callback, false);
  } else {
    // IE8以下兼容方式;手动添加on
    obj.attachEvent('on' + eventStr, function() {
      // 在匿名函数中调用回调函数
      callback.call(obj);
    });
  }
}

class GitMaster extends EventEmitter2 {
  public helper: Helper;

  public log: Logger;

  public storage: Storage;

  public pluginLoader: PluginLoader | undefined;

  public currentAdapter: any;

  public eventKey = {
    pjaxEnd: 'pjac-end',
  };

  private lifecycle: Lifecycle | undefined = undefined;

  private config: Config | undefined = undefined;

  public constructor() {
    super();
    this.helper = {
      beforeDocumentLoadedPlugins: new LifecyclePlugins('beforeDocumentLoadedPlugins', this),
      documentLoadedPlugins: new LifecyclePlugins('documentLoadedPlugins', this),
      injectPlugins: new LifecyclePlugins('injectPlugins', this),
      afterPlugins: new LifecyclePlugins('afterPlugins', this),
    };

    this.log = new Logger(this);
    this.storage = new Storage(this);

    this.on('notification', notice => {
      console.error(notice);
    });

    this.initConfig();
  }

  public setCurrentAdapterName(name: string): void {
    LifecyclePlugins.currentAdapterName = name;
  }

  public setCurrentAdapter(name: string, adapter: any): void {
    LifecyclePlugins.currentAdapterName = name;
    LifecyclePlugins.currentAdapter = adapter;
    this.currentAdapter = adapter;
  }

  public async init(): Promise<any> {
    try {
      // load self plugins
      this.pluginLoader = new PluginLoader(this);
      this.setCurrentPluginName('gitmaster');

      this.initEvents();

      this.setCurrentPluginName('');

      // load third-party plugins
      this.pluginLoader.load();
      this.lifecycle = new Lifecycle(this);

      await this.lifecycle.start();
    } catch (e) {
      // @ts-ignore
      this.log.error(e);
      this.emit('failed', e);
      throw e;
    }
  }

  // save to db
  public saveConfig(config: Config): void {
    this.setConfig(config);
  }

  // remove from db
  public removeConfig(key: string, propName: string): void {
    if (!key || !propName) return;
    this.unsetConfig(key, propName);
  }

  // get config
  public getConfig(name = ''): any {
    if (!this.config) return;
    if (name) {
      return get(this.config, name);
    } else {
      return this.config;
    }
  }

  public setCurrentPluginName(name: string): void {
    LifecyclePlugins.currentPlugin = name;
  }

  private initConfig(): void {
    const production = process.env.NODE_ENV === 'production';

    this.config = {
      debug: !production,
      logLevel: production ? 'error' : 'all',
    };
  }

  private initEvents(): void {
    $(document).on(EVENT.LOC_CHANGE, () => {
      this.emit(this.eventKey.pjaxEnd, this);
    });
  }

  // unset config for ctx but won't be saved to db
  private unsetConfig(key: string, propName: string): void {
    if (!key || !propName) return;
    unset(this.getConfig(key), propName);
  }

  // set config for ctx but will not be saved to db
  // it's more lightweight
  private setConfig(config: Config): void {
    Object.keys(config).forEach((name: string) => {
      // @ts-ignore
      set(this.config, name, config[name]);
    });
  }
}

export default GitMaster;
