import Clipboard from 'clipboard';
import { isGistFile } from '@/common/adapters/pageDetect/github';
import GitMaster from '../PageLife/core/GitMaster';

// todo 统一公用
function removeDom(selector: string) {
  if (!selector) {
    return;
  }

  [].forEach.call(document.querySelectorAll(selector), function(el) {
    // @ts-ignore
    el.parentNode.removeChild(el);
  });
}

function addCopyAndDownloadButton() {
  const blameBtn = $('.file-actions .btn, [data-hotkey="b"]');
  const markdownBody = $('.blob > .markdown-body');

  if (blameBtn.length && markdownBody.length === 0) {
    removeDom('.master-file-clipboard');
    // instantiate copy to clipborad
    const clipboard = new Clipboard('.master-file-clipboard'); // eslint-disable-line no-new

    clipboard.on('success', function(e: any) {
      e.clearSelection();
    });

    blameBtn.parent().prepend(`
      <button aria-label="Copy file contents to clipboard"
      class="master-file-clipboard btn btn-sm BtnGroup-item file-clipboard-button tooltipped tooltipped-s"
      data-copied-hint="Copied!" type="button" data-clipboard-target="tbody">
        Copy
      </button>
    `);
  }
}

function initCopy(adapter: any) {
  if (adapter.detect.isSingleFile()) {
    addCopyAndDownloadButton();
  }
}

function initGistCopy(_adapter: any) {
  const isGist = isGistFile();

  if (isGist) {
    const gistHeaders = $('.js-task-list-container .file-header .file-actions');

    if (gistHeaders.length) {
      // instantiate copy to clipborad
      const clipboard = new Clipboard('.master-gist-file-clipboard', {
        target: function(trigger: any) {
          const fileHeader = $(trigger).parents('.file-header');

          return fileHeader.siblings('.Box-body').get(0);
        },
      }); // eslint-disable-line no-new

      clipboard.on('success', function(e: any) {
        if (e.trigger) {
          const copiedMsg = e.trigger.getAttribute('data-copied-hint');
          const originMsg = e.trigger.innerText;

          e.trigger.innerText = copiedMsg;

          setTimeout(function() {
            e.trigger.innerText = originMsg;
          }, 1500);
        }

        e.clearSelection();
      });

      gistHeaders.each(function() {
        $(this).append(`<a aria-label="Copy file contents to clipboard"
      class="master-gist-file-clipboard btn btn-sm tooltipped tooltipped-s"
      data-copied-hint="Copied!" type="button" style="text-align: center;width: 70px;">
        Copy
      </a>`);
      });
    }
  }
}

export default (ctx: GitMaster) => {
  const register = () => {
    ctx.helper.documentLoadedPlugins.register('copy-file', {
      async handle() {
        initCopy(ctx.currentAdapter);
      },
      config: [],
      scope: ['github'],
      repeatOnAjax: true,
    });

    ctx.helper.documentLoadedPlugins.register('gist-copy-file', {
      async handle() {
        initGistCopy(ctx.currentAdapter);
      },
      config: [],
      scope: ['gist'],
      repeatOnAjax: true,
    });
  };
  return {
    register,
    config: [],
  };
};
