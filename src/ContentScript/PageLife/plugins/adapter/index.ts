import GitMaster from '../../core/GitMaster';

import defaultAdapter from './default';

export default (ctx: GitMaster): void => {
  ctx.helper.adapter.register('default', defaultAdapter);
}
