import GitMaster from './GitMaster';
import CodeTree from '../../codeTree';

const adapter = async (ctx: GitMaster): Promise<GitMaster> => {
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

export default adapter;

