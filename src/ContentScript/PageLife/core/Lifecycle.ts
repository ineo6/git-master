import { EventEmitter2 } from 'eventemitter2';
import onDomReady from 'dom-loaded';
import GitMaster from './GitMaster';
import { Plugin } from '../../interfaces';
import adapter from './adapter';

class Lifecycle extends EventEmitter2 {
  ctx: GitMaster;

  constructor(ctx: GitMaster) {
    super();
    this.ctx = ctx;
  }

  async start(input: any[]): Promise<GitMaster> {
    try {
      // images input
      if (!Array.isArray(input)) {
        throw new Error('Input must be an array.');
      }
      this.ctx.input = input;
      this.ctx.output = [];

      // lifecycle main
      await this.beforeDocumentLoaded(this.ctx);

      await onDomReady;

      await this.detect(this.ctx);

      if (this.ctx.currentAdapter) {
        await this.documentLoaded(this.ctx);
        await this.inject(this.ctx);
        await this.afterProcess(this.ctx);
      }

      return this.ctx;
    } catch (e) {
      this.ctx.log.warn('failed');
      this.ctx.emit('failed', e);
      this.ctx.log.error(e);
      if (this.ctx.getConfig('debug')) {
        throw e;
      }
    }
  }

  private async beforeDocumentLoaded(ctx: GitMaster): Promise<GitMaster> {
    this.ctx.emit('beforeDocumentLoaded', ctx);
    this.ctx.log.info('beforeDocumentLoaded');

    await this.handlePlugins(ctx.helper.beforeDocumentLoadedPlugins.getList(), ctx);
    return ctx;
  }

  private async documentLoaded(ctx: GitMaster): Promise<GitMaster> {
    this.ctx.emit('documentLoaded', ctx);
    this.ctx.log.info('documentLoaded');

    await this.handlePlugins(ctx.helper.documentLoadedPlugins.getList(), ctx);
    return ctx;
  }

  private async detect(ctx: GitMaster): Promise<GitMaster> {
    this.ctx.log.info('detect...');
    this.ctx.emit('detect', ctx);
    let type = ctx.getConfig('picBed.current') || 'default';

    await adapter(ctx);
    for (let i in ctx.output) {
      ctx.output[i].type = type;
    }
    return ctx;
  }

  private async inject(ctx: GitMaster): Promise<GitMaster> {
    this.ctx.emit('inject', ctx);
    this.ctx.log.info('inject');

    await this.handlePlugins(ctx.helper.injectPlugins.getList(), ctx);
    return ctx;
  }

  private async afterProcess(ctx: GitMaster): Promise<GitMaster> {
    this.ctx.emit('afterProcess', ctx);
    await this.handlePlugins(ctx.helper.afterPlugins.getList(), ctx);

    this.ctx.emit('finished', ctx);
    return ctx;
  }

  private async handlePlugins(plugins: Plugin[], ctx: GitMaster): Promise<GitMaster> {
    await Promise.all(
      plugins.map(async (plugin: Plugin) => {
        await plugin.handle(ctx);
      }),
    );
    return ctx;
  }
}

export default Lifecycle;
