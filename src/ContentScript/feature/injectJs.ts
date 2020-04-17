import GitMaster from '../PageLife/core/GitMaster';
import {injectCustomJs} from '@/common/util.ext';

export default (ctx: GitMaster) => {
  const register = () => {
    ctx.helper.documentLoadedPlugins.register('injectCustomJs', {
      async handle() {
        injectCustomJs();
      },
    });
  };
  return {
    register,
  };
}
