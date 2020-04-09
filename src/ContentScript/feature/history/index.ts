import GitMaster from '../../core/GitMaster';
import { isButtonInsertedGithub, isButtonInsertedGitlab } from './history';

export default (ctx: GitMaster) => {
  const register = () => {
    ctx.helper.documentLoadedPlugins.register('github-history', {
      async handle() {
        isButtonInsertedGithub(document.URL);
      },
      config: [],
      scope: ['github'],
      load: [ctx.event.pjaxEnd],
    });

    ctx.helper.documentLoadedPlugins.register('gitlab-history', {
      async handle() {
        isButtonInsertedGitlab(document.URL);
      },
      config: [],
      scope: ['gitlab'],
      load: [ctx.event.pjaxEnd],
    });
  };
  return {
    register,
    config: [],
  };
}
