// eslint-disable-next-line import/no-unresolved

import GitMaster from './core/GitMaster';

class GitHelper {
  adapter: null;

  constructor() {

  }

  setAdapter(adapter: any) {
    this.adapter = adapter;
  }

  async run() {
    // 全局信息

    // 首先判断是什么网站

    // 获取全局仓库信息 repo

    // 调用注册 content script

    // const codeTree = new CodeTree();

    // $(document)
    //   .ready(async () => {
    //     const adapter = await codeTree.init();
    //
    //     this.setAdapter(adapter);
    //   });

    const gitMaster = new GitMaster();

    await gitMaster.upload();
  }
}

export default GitHelper;
