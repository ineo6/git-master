import { copyElementContent } from '@/ContentScript/util';
import './index.less';

export function appendAttachCopy(target: string) {
  const documentBase = $(target);
  const copyCls = 'master-icon-copy1';
  const successCls = 'master-icon-success';
  const failCls = 'master-icon-fail';

  if (documentBase.length) {
    const preDom = documentBase.find('pre');

    const hoverBtn = $('<div class="gm-clipboard-wrapper"><span class="gm-clipboard-btn"><i class="masterfont master-icon-copy1"></i></span></div>');

    preDom.each((_index, pre) => {
      const button = hoverBtn.clone();

      button
        .click(function() {
          // eslint-disable-next-line @typescript-eslint/no-invalid-this
          const ele = $(this).find('.masterfont');

          if (copyElementContent(pre)) {
            ele.removeClass(copyCls).addClass(successCls);
          } else {
            ele.removeClass(copyCls).addClass(failCls);
          }

          setTimeout(function() {
            ele
              .removeClass(successCls)
              .removeClass(failCls)
              .addClass(copyCls);
          }, 1000);
        })
        .insertBefore($(pre));

      $(pre)
        .mouseover(function() {
          button.find('.gm-clipboard-btn').show();
        })
        .mouseout(function(e) {
          if (e.relatedTarget && !$(e.relatedTarget).hasClass('masterfont') && !$(e.relatedTarget).hasClass('gm-clipboard-btn')) {
            button.find('.gm-clipboard-btn').hide();
          }
        });
    });
  }
}

export function initGitee() {
  appendAttachCopy('#tree-holder #git-readme .file_content');
  appendAttachCopy('#git-issue .git-issue-body');
}

export function initGitea() {
  appendAttachCopy('.repository.file .container .markdown');
  appendAttachCopy('.repository.issue .container .comment-list');
}
