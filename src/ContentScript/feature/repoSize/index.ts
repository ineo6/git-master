import GitMaster from '../../core/GitMaster';
import RepoView from './RepoView';

export default (ctx: GitMaster) => {
  const register = () => {
    ctx.helper.documentLoadedPlugins.register('repoSize', {
      async handle() {
        const repoView = new RepoView(ctx.currentAdapter, ctx.storage);

        await repoView.init();
      },
      config: [],
      scope: ['github'],
      load: [ctx.event.pjaxEnd],
    });
  };
  return {
    register,
    config: [],
  };
}
