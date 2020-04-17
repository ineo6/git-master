import GitMaster from '../../core/GitMaster';
import { PluginConfig } from '../../../interfaces';
import CodeTree from '../../../codeTree';

const handle = async (ctx: GitMaster): Promise<GitMaster> => {
  try {
    const codeTree = new CodeTree();

    const adapter = await codeTree.init();

    if (adapter) {
      ctx.setCurrentAdapter(adapter.whoami(), adapter);
    }

    return ctx;
  } catch (err) {
    ctx.emit('notification', {
      title: '初始化失败',
      body: '',
    });
    throw err;
  }
};

const config = (): PluginConfig[] => {
  return [];
};

export default {
  name: 'DefaultAdapter',
  handle,
  config,
};
