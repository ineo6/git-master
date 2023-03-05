import GitMaster from '../../PageLife/core/GitMaster';
import { initGitee, initGitea } from './copy';

export default (ctx: GitMaster) => {
  const register = () => {
    ctx.helper.documentLoadedPlugins.register('gitee-attach-copy', {
      async handle() {
        initGitee();
      },
      config: [],
      scope: ['gitee'],
      repeatOnAjax: true,
    });

    ctx.helper.documentLoadedPlugins.register('gitea-attach-copy', {
      async handle() {
        initGitea();
      },
      config: [],
      scope: ['gitea'],
      repeatOnAjax: true,
    });
  };
  return {
    register,
    config: [],
  };
};
