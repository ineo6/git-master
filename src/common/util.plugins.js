// Add custom JS Tree Plugins here

import extStore from '@/common/core.storage';
import { STORE } from '@/common/core.constants';

/**
 * Mimic logic from JSTree
 * https://github.com/vakata/jstree/blob/master/src/misc.js#L148
 *
 * Plugin truncate path name
 */

async function treeTruncate() {
  $.jstree.defaults.truncate = $.noop;
  $.jstree.plugins.truncate = function(opts, parent) {
    this.redraw_node = function(obj, deep, callback, forceDraw) {
      obj = parent.redraw_node.call(this, obj, deep, callback, forceDraw);

      let anchor = null;

      if (obj) {
        anchor = $(obj).children('.jstree-anchor');

        if (anchor.length) {
          // wrap content
          anchor
            .contents()
            .filter(function() {
              // Get text node which is path name
              return this.nodeType === 3;
            })
            .wrap('<div style="overflow: hidden;text-overflow: ellipsis;"></div>')
            .end();

          anchor.children().wrapAll('<div class="jstree-anchor-inner"></div>');

          extStore.get(STORE.FILESIZE).then(showFileSize => {
            if (showFileSize) {
              let sizeInfo = '';
              const anchorData = anchor.data();

              if (anchorData.fileCount) {
                sizeInfo = `<span class="gm-tree-file-info">${anchorData.fileCount}</span>`;
              } else if (anchorData.fileSize) {
                sizeInfo = `<span class="gm-tree-file-info">${anchorData.fileSize}</span>`;
              }

              // append size
              anchor.addClass('gm-show-file-info');
              anchor.append(sizeInfo);
            }
          });
        }
      }

      return obj;
    };
  };
}

treeTruncate();

export default {};
