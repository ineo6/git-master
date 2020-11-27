import GitMaster from '../../PageLife/core/GitMaster';
import { isButtonInsertedGithub, isButtonInsertedGitlab } from './history';

export default (ctx: GitMaster) => {
  const register = () => {
    if (process.env.TARGET_BROWSER === 'safari') {
      return;
    }

    ctx.helper.documentLoadedPlugins.register('github-history', {
      async handle() {
        isButtonInsertedGithub(document.URL);
      },
      config: [],
      scope: ['github'],
      repeatOnAjax: true,
    });

    ctx.helper.documentLoadedPlugins.register('gitlab-history', {
      async handle() {
        isButtonInsertedGitlab(document.URL);
      },
      config: [],
      scope: ['gitlab'],
      repeatOnAjax: true,
    });
  };
  return {
    register,
    config: [],
  };
};
