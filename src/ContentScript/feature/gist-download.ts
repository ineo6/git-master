import GitMaster from '../PageLife/core/GitMaster';
import saveAs from '@/common/fileSave';
import Clipboard from 'clipboard';
import { IGistFile } from '@/ContentScript/interfaces';

let globalGistData: IGistFile[] = [];

async function getGists(adapter: any): Promise<IGistFile[]> {
  const token = await adapter.getAccessToken();

  const repo = await adapter.getRepoDataWrap(false, token);

  const data = await adapter.getGists(encodeURIComponent(decodeURIComponent(repo.branch)), {
    repo,
  });

  return data;
}

function applyAction(gistName: string, cb: Function): string | void {
  const matchGist = globalGistData.find((item: { filename: string }) => item.filename.trim() === gistName.trim());

  if (matchGist) {
    return cb(matchGist);
  }
}

async function appendGistDownload(adapter: any) {
  if (adapter && adapter.detect.isGistFile()) {
    const gistHeaders = $('.js-task-list-container .file-header');

    if (gistHeaders.length) {
      $(document).on('click', '.master-gist-file-download', function() {
        const btnData = $(this).data();

        applyAction(btnData.gistName.trim(), function(match: any) {
          if (match.content) {
            const blob = new Blob([match.content], { type: match.type });

            saveAs(blob, btnData.gistName.trim());
          } else if (match.raw_url) {
            saveAs(match.raw_url, btnData.gistName.trim());
          }
        });
      });

      // instantiate copy to clipborad
      const clipboard = new Clipboard('.master-gist-file-clipboard', {
        text: function(trigger: any) {
          const btnData = $(trigger).data();

          return applyAction(btnData.gistName.trim(), function(match: any) {
            if (match.content) {
              return match.content;
            }
          });
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
        const gistHead = $(this);

        const nameInDom = gistHead.find('.gist-blob-name').text();

        gistHead.find('.file-actions').append(`<a aria-label="Copy file contents to clipboard" data-gist-name="${nameInDom}"
      class="master-gist-file-clipboard btn btn-sm tooltipped tooltipped-s"
      data-copied-hint="Copied!" type="button" style="text-align: center;width: 70px;">
        Copy
      </a>`);

        gistHead.find('.file-actions').append(`<a aria-label="Download this file" data-gist-name="${nameInDom}"
      class="master-gist-file-download btn btn-sm tooltipped tooltipped-s"
      type="button" style="text-align: center;width: 80px;margin-left: 4px">
        Download
      </a>`);
      });

      globalGistData = await getGists(adapter);
    }
  }
}

export default (ctx: GitMaster) => {
  const register = () => {
    ctx.helper.documentLoadedPlugins.register('gist-down', {
      async handle() {
        await appendGistDownload(ctx.currentAdapter);
      },
      config: [],
      scope: ['gist'],
    });
  };
  return {
    register,
    config: [],
  };
};
