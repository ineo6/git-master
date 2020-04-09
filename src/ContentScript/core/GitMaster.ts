import { EventEmitter2 } from 'eventemitter2';
import get from 'lodash.get';
import set from 'lodash.set';
import unset from 'lodash.unset';
import Lifecycle from './Lifecycle';
import LifecyclePlugins from '../lib/LifecyclePlugins';
import PluginLoader from '../lib/PluginLoader';
import Logger from '../lib/Logger';
import Storage from '../lib/Storage';
import adapter from '../plugins/adapter';
import { Config, Helper, ImgInfo } from '../interfaces';

function bind(obj: any, eventStr: string, callback: Function) {
  if (obj.addEventListener) {
    //大部分浏览器兼容方式
    obj.addEventListener(eventStr, callback, false);
  } else {
    //IE8以下兼容方式;手动添加on
    obj.attachEvent('on' + eventStr, function() {
      //在匿名函数中调用回调函数
      callback.call(obj);
    });
  }
}

class GitMaster extends EventEmitter2 {
  private lifecycle: Lifecycle | undefined = undefined;

  private config: Config | undefined = undefined;

  helper: Helper;

  log: Logger;

  storage: Storage;

  output: ImgInfo[];

  input: any[];

  pluginLoader: PluginLoader | undefined;

  currentAdapter: any;

  event = {
    pjaxEnd: 'pjac-end',
  };

  constructor() {
    super();
    this.output = [];
    this.input = [];
    this.helper = {
      adapter: new LifecyclePlugins('adapter', this),
      beforeDocumentLoadedPlugins: new LifecyclePlugins('beforeDocumentLoadedPlugins', this),
      documentLoadedPlugins: new LifecyclePlugins('documentLoadedPlugins', this),
      injectPlugins: new LifecyclePlugins('injectPlugins', this),
      afterPlugins: new LifecyclePlugins('afterPlugins', this),
    };

    this.log = new Logger(this);
    this.storage = new Storage(this);

    this.on('notification', (notice) => {
      console.error(notice);
    });

    this.initConfig();
    this.init();
  }

  setCurrentPluginName(name: string): void {
    LifecyclePlugins.currentPlugin = name;
  }

  setCurrentAdapter(name: string, adapter: any): void {
    LifecyclePlugins.currentAdapterName = name;
    LifecyclePlugins.currentAdapter = adapter;
    this.currentAdapter = adapter;
  }

  initConfig(): void {
    this.config = {};
  }

  init(): any {
    try {
      // load self plugins
      this.pluginLoader = new PluginLoader(this);
      this.setCurrentPluginName('gitmaster');

      this.initEvents();

      adapter(this);

      this.setCurrentPluginName(null);

      // load third-party plugins
      this.pluginLoader.load();
      this.lifecycle = new Lifecycle(this);
    } catch (e) {
      this.emit('uploadProgress', -1);
      this.log.error(e);
      throw e;
    }
  }

  initEvents(): void {
    bind(document, 'pjax:end', () => {
      this.emit(this.event.pjaxEnd, this);
    });
  }

  // get config
  getConfig(name: string = ''): any {
    if (!this.config) return;
    if (name) {
      return get(this.config, name);
    } else {
      return this.config;
    }
  }

  // save to db
  saveConfig(config: Config): void {
    this.setConfig(config);
  }

  // remove from db
  removeConfig(key: string, propName: string): void {
    if (!key || !propName) return;
    this.unsetConfig(key, propName);
  }

  // unset config for ctx but won't be saved to db
  unsetConfig(key: string, propName: string): void {
    if (!key || !propName) return;
    unset(this.getConfig(key), propName);
  }

  // set config for ctx but will not be saved to db
  // it's more lightweight
  setConfig(config: Config): void {
    Object.keys(config).forEach((name: string) => {
      // @ts-ignore
      set(this.config, name, config[name]);
    });
  }

  async upload(): Promise<void | string | Error> {
    try {
      await this.lifecycle.start([]);
    } catch (e) {
      this.log.error(e);
      this.emit('failed', e);
      throw e;
    }
  }
}

export default GitMaster;
