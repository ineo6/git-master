import GitMaster from '../../PageLife/core/GitMaster';
import GitHubRepoInfo from './GitHubRepoInfo';
import GiteeRepoInfo from './GiteeRepoInfo';

export default (ctx: GitMaster) => {
  const register = () => {
    ctx.helper.documentLoadedPlugins.register('github-repoSize', {
      async handle() {
        if (ctx.storage) {
          const options = await ctx.storage.getAll();

          const enable = !!options.addFolderInfo;

          if (enable) {
            const repoView = new GitHubRepoInfo(ctx.currentAdapter, ctx.storage);

            await repoView.init();
          }
        }
      },
      config: [],
      scope: ['github'],
      repeatOnAjax: true,
    });

    ctx.helper.documentLoadedPlugins.register('gitee-repoSize', {
      async handle() {
        const repoView = new GiteeRepoInfo(ctx.currentAdapter, ctx.storage);

        await repoView.init();
      },
      config: [],
      scope: ['gitee'],
      repeatOnAjax: true,
    });
  };
  return {
    register,
    config: [],
  };
};
