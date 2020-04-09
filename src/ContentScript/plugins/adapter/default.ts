import GitMaster from '../../core/GitMaster';
import { PluginConfig } from '../../interfaces';
import CodeTree from '../../codeTree';

const handle = async (ctx: GitMaster): Promise<GitMaster> => {
  try {
    const codeTree = new CodeTree();

    const adapter = await codeTree.init();

    ctx.setCurrentAdapter(adapter.whoami(), adapter);

    return ctx;
  } catch (err) {
    ctx.emit('notification', {
      title: '上传失败',
      body: '服务端出错，请重试',
    });
    console.log(err)
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
