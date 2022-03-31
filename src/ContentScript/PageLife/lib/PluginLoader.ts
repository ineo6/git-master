import GitMaster from '../core/GitMaster';
import Plugins from '../../feature';

class PluginLoader {
  public ctx: GitMaster;

  private list: string[];

  private plugins: any;

  public constructor(ctx: GitMaster) {
    this.ctx = ctx;
    this.list = [];
    this.plugins = Plugins;
    this.init();
  }

  // load all third party plugin
  public load() {
    const modules = Object.keys(this.plugins);
    // eslint-disable-next-line guard-for-in
    for (let i in modules) {
      this.registerPlugin(modules[i]);
    }
  }

  public registerPlugin(name: string): void {
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

  private init(): void {}

  // get plugin by name
  private getPlugin(name: string): any {
    const plugins: any[] = this.plugins;
    // @ts-ignore
    return plugins[name](this.ctx);
  }
}

export default PluginLoader;
