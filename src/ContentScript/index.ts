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
import { whichSite } from '@/ContentScript/util';
import { DICT, STORE } from '@/common/core.constants';
import extStore from '@/common/core.storage';
import { browser } from 'webextension-polyfill-ts';
import GitMaster from './PageLife/core/GitMaster';

async function loadNow() {
  const siteType = await whichSite();

  const darkClassName = 'gm-default-theme-' + siteType;

  if (siteType === DICT.GITHUB || siteType === DICT.GIST) {
    let isDarkMode = await extStore.get(STORE.DARKMODE);

    if (isDarkMode) {
      $('html').addClass(darkClassName);
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
