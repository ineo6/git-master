import GitMaster from '../core/GitMaster';
import Plugins from '../../feature';

class PluginLoader {
  ctx: GitMaster;

  list: string[];

  plugins: any;

  constructor(ctx: GitMaster) {
    this.ctx = ctx;
    this.list = [];
    this.plugins = Plugins;
    this.init();
  }

  init(): void {
  }


  // load all third party plugin
  load(): void | boolean {
    const modules = Object.keys(this.plugins);
    for (let i in modules) {
      this.registerPlugin(modules[i]);
    }
  }

  registerPlugin(name: string): void {
    try {
      this.list.push(name);
      this.ctx.setCurrentPluginName(name);
      this.getPlugin(name).register();
    } catch (e) {
      this.list = this.list.filter((item: string) => item !== name);

      this.ctx.emit('notification', {
        title: `Plugin ${name} Load Error`,
        body: e,
      });
    }
  }

  unregisterPlugin(name: string): void {
    this.list = this.list.filter((item: string) => item !== name);
    this.ctx.setCurrentPluginName(name);
    this.ctx.helper.beforeDocumentLoadedPlugins.unregister(name);
    this.ctx.helper.documentLoadedPlugins.unregister(name);
    this.ctx.helper.injectPlugins.unregister(name);
    this.ctx.helper.afterPlugins.unregister(name);
  }

  // get plugin by name
  getPlugin(name: string): any {
    const plugins: any[] = this.plugins;
    // @ts-ignore
    return plugins[name](this.ctx);
  }

  // get plugin name list
  getList(): string[] {
    return this.list;
  }
}

export default PluginLoader;
