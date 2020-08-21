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

export function initGitHub() {
  appendAttachCopy('.repository-content div#readme article');

  // code in issue
  appendAttachCopy('#discussion_bucket .js-discussion');
}

function observeReadme(cb: () => void) {
  // 选择需要观察变动的节点
  const targetNode = document.getElementById('tree-holder');

  // 观察器的配置（需要观察什么变动）
  const config = {
    childList: true,
    subtree: true,
  };

  // 当观察到变动时执行的回调函数
  const callback = function(mutationsList: any, _observer: any) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        if (mutation.target.classList.value.indexOf('blob-viewer') >= 0) {
          cb && cb();
        }
      }
    }
  };

  const observer = new MutationObserver(callback);

  targetNode && observer.observe(targetNode, config);
}

export function initGitLab() {
  let flag = false;

  observeReadme(function() {
    // will trigger many times
    if (!flag) {
      appendAttachCopy('#tree-holder .file-holder .file-content');
      flag = true;
    }
  });

  appendAttachCopy('#content-body .issue-details');
}

export function initGitee() {
  appendAttachCopy('#tree-holder #git-readme .file_content');
  appendAttachCopy('#git-issue .git-issue-body');
}

export function initGitea() {
  appendAttachCopy('.repository.file .container .markdown');
  appendAttachCopy('.repository.issue .container .comment-list');
}
