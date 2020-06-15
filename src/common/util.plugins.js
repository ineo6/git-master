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

      extStore.get(STORE.FILESIZE).then(showFileSize => {
        if (obj) {
          const anchor = $(obj).find('.jstree-anchor');
          const anchorData = anchor.data();
          let sizeInfo = '';

          if (anchorData.fileCount) {
            sizeInfo = `<span class="gm-tree-file-info">${anchorData.fileCount}</span>`;
          } else if (anchorData.fileSize) {
            sizeInfo = `<span class="gm-tree-file-info">${anchorData.fileSize}</span>`;
          }

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

          if (showFileSize) {
            // append size

            anchor.append(sizeInfo);
          }
        }
      });

      return obj;
    };
  };
}

treeTruncate();

export default {};
