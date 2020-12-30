import 'jquery';
import 'jquery-ui/ui/widgets/resizable';
import 'whatwg-fetch';
import '../common/styles/main.less';
import '@ineo6/file-icons/index.less';
import '../common/libs/jstree.css';
import './index.less';
import './ui/toast';
import './ui/toast/index.less';
import './ui/toast/toast';
import './theme/app.less';
import '../common/libs/master-font.less';
import { inSystemDarkMode, isGitHubInDark, subscribeDarkModeAndChange, whichSite } from '@/ContentScript/util';
import { DICT, shareClassName, STORE } from '@/common/core.constants';
import extStore from '@/common/core.storage';
import { browser } from 'webextension-polyfill-ts';
import GitMaster from './PageLife/core/GitMaster';

async function loadNow() {
  const siteType = await whichSite();

  const darkClassName = 'gm-default-theme-' + siteType;

  if (siteType === DICT.GITHUB || siteType === DICT.GIST) {
    const isDarkMode = await extStore.get(STORE.DARKMODE);
    const isBuildInDark = await extStore.get(STORE.BUILD_IN_DARK);
    const githubIsDark = isGitHubInDark();

    // use build-in and dark mode on
    if (isBuildInDark) {
      if (isDarkMode) {
        $('html')
          .addClass(darkClassName)
          .addClass(shareClassName.sidebarDarkCls);
      } else {
        // if githubIsDark enable to disable or make toast
      }
    } else {
      // use github dark mode
      // only enable sidebar dark mode
      // eslint-disable-next-line no-lonely-if
      if (githubIsDark || inSystemDarkMode()) {
        $('html').addClass(shareClassName.sidebarDarkCls);
      }

      subscribeDarkModeAndChange();
    }
  }
}

function createListener() {
  window.addEventListener('message', function(e) {
    if (e.data.type === 'ga') {
      browser.runtime.sendMessage({
        type: 'report',
        data: e.data.data,
      });
    }
  });
}

loadNow();

createListener();

const gitMaster = new GitMaster();

gitMaster.init();
