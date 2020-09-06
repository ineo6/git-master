import Clipboard from 'clipboard';
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
  };
  return {
    register,
    config: [],
  };
};
