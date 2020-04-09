import GitMaster from '../core/GitMaster';
import { i18n } from '../../common/util.ext';

export default (ctx: GitMaster) => {
  const register = () => {
    ctx.helper.afterPlugins.register('i18n', {
      async handle() {
        i18n();
      },
    });
  };
  return {
    register,
  };
}
