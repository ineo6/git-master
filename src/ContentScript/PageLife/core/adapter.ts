import GitMaster from './GitMaster';
import CodeTree from '../../codeTree';

const adapter = async (ctx: GitMaster): Promise<void> => {
  try {
    const codeTree = new CodeTree();

    const adapter = await codeTree.init();

    if (adapter) {
      ctx.setCurrentAdapter(adapter.whoami(), adapter);
    }
  } catch (err) {
    ctx.emit('notification', {
      title: '初始化失败',
      body: err.message,
    });
  }
};

adapter.getSiteType = CodeTree.getSiteType;

export default adapter;
