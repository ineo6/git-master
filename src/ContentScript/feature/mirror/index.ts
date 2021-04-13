import { isReleasesOrTags } from 'github-url-detection';
import { rocketSvg } from '@/common/svg';
import GitMaster from '../../PageLife/core/GitMaster';
import './index.less';

const zipDownload = {
  fastgit: 'https://download.fastgit.org',
};

const httpsMirror = [
  {
    name: 'fastgit',
    url: 'https://hub.fastgit.org',
  },
  {
    name: 'cnpmjs',
    url: 'https://github.com.cnpmjs.org',
  },
  {
    name: 'gitclone',
    url: 'https://gitclone.com',
  },
];

const downloadMirror = [
  {
    name: 'fastgit',
    url: 'https://download.fastgit.org',
  },
  {
    name: '备用',
    url: 'https://ghproxy.com',
  },
];

function alwaysShowCodeDown() {
  $('get-repo')
    .parent()
    .addClass('d-sm-flex');
}

function appendCloneMirror(root: JQuery) {
  const tabContainer = root.find('tab-container');

  const tabPanel = tabContainer.find('div[role="tabpanel"]');

  const httpsPanel = tabPanel[0];

  const defaultHttps = $(httpsPanel).find('.input-group');

  const defaultHttpsUrl = defaultHttps.find('input').val() || '';

  const parsedUrl = new URL(defaultHttpsUrl as string);

  const urlArr = parsedUrl.pathname.split('/');

  httpsMirror.forEach(urlConfig => {
    let replaceUrl = urlConfig.url;

    if (urlConfig.name === 'fastgit') {
      replaceUrl += '/' + urlArr[1] + '/' + urlArr[2];
    } else if (urlConfig.name === 'gitclone') {
      replaceUrl += '/github.com/' + urlArr[1] + '/' + urlArr[2];
    } else if (urlConfig.name === 'cnpmjs') {
      replaceUrl += '/' + urlArr[1] + '/' + urlArr[2];
    }

    $(`
<p class="mt-2">${urlConfig.name}：</p>
<div class="input-group">
	<input type="text" class="form-control input-monospace input-sm bg-gray-light"
	data-autoselect="" value="${replaceUrl}"
	aria-label="${replaceUrl}" readonly="">
	<div class="input-group-button">
		<clipboard-copy value="${replaceUrl}"
		aria-label="Copy to clipboard"
		class="btn btn-sm"
		tabindex="0" role="button">
			<svg class="octicon octicon-clippy" viewBox="0 0 16 16" version="1.1"
			width="16" height="16" aria-hidden="true">
				<path fill-rule="evenodd" d="M5.75 1a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75h-4.5zm.75 3V2.5h3V4h-3zm-2.874-.467a.75.75 0 00-.752-1.298A1.75 1.75 0 002 3.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-9.5a1.75 1.75 0 00-.874-1.515.75.75 0 10-.752 1.298.25.25 0 01.126.217v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5a.25.25 0 01.126-.217z">
				</path>
			</svg>
		</clipboard-copy>
	</div>
</div>`).insertAfter(defaultHttps);
  });
}

function addTags(commits: JQuery<HTMLElement>) {
  commits.each(function() {
    $(this)
      .find('.octicon-file-zip')
      .each(function() {
        const url = $(this)
          .parent()
          .attr('href');

        const mirrorUrl = new URL(url as string, zipDownload.fastgit);

        $(this)
          .parent()
          .after(`<a title="mirror for speed" class="git-master-mirror-tags-btn" href="${mirrorUrl}">${rocketSvg}</a>`);
      });
  });
}

function addRelease() {
  const normalRelease = $('.release-timeline-tags');

  if (normalRelease && normalRelease.length) {
    addTags(normalRelease.find('.release-main-section>.commit'));
  } else {
    $('.git-master-mirror-release-download').remove();
    $('.Box.Box--condensed').each(function() {
      $(this)
        .find('.d-flex.Box-body,.d-block.Box-body')
        .each(function() {
          const aLink = $(this).find('a');

          if (aLink && aLink.length) {
            const downArea = $('<div></div>')
              .addClass(aLink.attr('class') || '')
              .append(aLink);

            let href = aLink.attr('href');

            downloadMirror[0].url += href;
            downloadMirror[1].url = downloadMirror[1].url + '/https://github.com' + href;

            const html = `<div class="git-master-mirror-release-download" style="display: flex;justify-content: flex-end;">
<div><a class="btn btn-sm ml-2" href="${downloadMirror[0].url}" rel="noreferrer noopener nofollow">${downloadMirror[0].name}</a></div>
<div><a class="btn btn-sm ml-2" href="${downloadMirror[1].url}" rel="noreferrer noopener nofollow">${downloadMirror[1].name}</a></div>
</div>`;
            downArea.append(html);

            $(this).prepend(downArea);
          }
        });

      document
        .querySelectorAll('small.pl-2.text-gray.flex-shrink-0')
        .forEach((el: any) => (el.style.cssText = 'display: flex; justify-content: flex-end; flex-grow: 1; margin-right: 8px;'));

      // Source Code
      $(this)
        .find('.d-block.Box-body>a')
        .each(function() {
          const href = $(this).attr('href');

          downloadMirror[0].url += href;
          downloadMirror[1].url = downloadMirror[1].url + '/https://github.com' + href;

          const html = `<div style="display: flex;justify-content: flex-end;flex-grow: 1;">
<div><a class="btn btn-sm ml-2" href="${downloadMirror[0].url}" rel="noreferrer noopener nofollow">${downloadMirror[0].name}</a></div>
<div><a class="btn btn-sm ml-2" href="${downloadMirror[1].url}" rel="noreferrer noopener nofollow">${downloadMirror[1].name}</a></div>
</div>`;
          $(this).after(html);
        });
    });

    document.querySelectorAll('div.d-block.py-1.py-md-2.Box-body.px-2').forEach(el => (el.className = 'd-flex py-1 py-md-2 Box-body px-2'));
  }
}

function initMirror() {
  const getRepo = $('get-repo');
  const zipIcon = $('.octicon-file-zip');
  if (getRepo && getRepo.length) {
    appendCloneMirror(getRepo);

    if (zipIcon.length && zipIcon.length) {
      const zipLink = zipIcon.parent();
      const zipUrl = zipLink.attr('href') || '';

      const url = new URL(zipUrl, zipDownload.fastgit);

      $(`<li class="Box-row Box-row--hover-gray p-0">
      <a class="d-flex flex-items-center color-text-primary text-gray-dark text-bold no-underline p-3"
      rel="nofollow" href="${url}">
        <svg class="octicon octicon-file-zip mr-3" viewBox="0 0 16 16" version="1.1"
        width="16" height="16" aria-hidden="true">
          <path fill-rule="evenodd" d="M3.5 1.75a.25.25 0 01.25-.25h3a.75.75 0 000 1.5h.5a.75.75 0 000-1.5h2.086a.25.25 0 01.177.073l2.914 2.914a.25.25 0 01.073.177v8.586a.25.25 0 01-.25.25h-.5a.75.75 0 000 1.5h.5A1.75 1.75 0 0014 13.25V4.664c0-.464-.184-.909-.513-1.237L10.573.513A1.75 1.75 0 009.336 0H3.75A1.75 1.75 0 002 1.75v11.5c0 .649.353 1.214.874 1.515a.75.75 0 10.752-1.298.25.25 0 01-.126-.217V1.75zM8.75 3a.75.75 0 000 1.5h.5a.75.75 0 000-1.5h-.5zM6 5.25a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 016 5.25zm2 1.5A.75.75 0 018.75 6h.5a.75.75 0 010 1.5h-.5A.75.75 0 018 6.75zm-1.25.75a.75.75 0 000 1.5h.5a.75.75 0 000-1.5h-.5zM8 9.75A.75.75 0 018.75 9h.5a.75.75 0 010 1.5h-.5A.75.75 0 018 9.75zm-.75.75a1.75 1.75 0 00-1.75 1.75v3c0 .414.336.75.75.75h2.5a.75.75 0 00.75-.75v-3a1.75 1.75 0 00-1.75-1.75h-.5zM7 12.25a.25.25 0 01.25-.25h.5a.25.25 0 01.25.25v2.25H7v-2.25z">
          </path>
        </svg>
        Download ZIP（Fast）
      </a>
    </li>`).insertAfter(zipLink.parent());
    }
  }

  if (isReleasesOrTags(new URL(window.location.href))) {
    addRelease();
    addTags($('.Box .commit'));
  }
}

export default (ctx: GitMaster) => {
  const register = () => {
    ctx.helper.documentLoadedPlugins.register('mirror', {
      async handle() {
        if (ctx.storage) {
          const options = await ctx.storage.getAll();

          const githubUseMirror = !!options.githubUseMirror;

          if (githubUseMirror) {
            alwaysShowCodeDown();
            initMirror();
          }
        }
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
