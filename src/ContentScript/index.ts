import 'jquery';
import 'jquery-ui/ui/widgets/resizable';
import 'whatwg-fetch';
import GitMaster from './PageLife/core/GitMaster';
import '../common/styles/octotree.less';
import '@ineo6/file-icons/index.less';
import '../common/libs/jstree.css';
import './index.less';
import './ui/toast';
import './ui/toast/index.less';
import './ui/toast/toast';
import './theme/app.less';
import '../common/libs/master-font.less';
import { inSystemDarkMode, whichSite } from '@/ContentScript/util';
import { DICT, STORE } from '@/common/core.constants';
import extStore from '@/common/core.storage';

async function loadNow() {
  const siteType = await whichSite();

  const darkClassName = 'gm-default-theme-' + siteType;

  if (siteType === DICT.GITHUB) {
    let isDarkMode = await extStore.get(STORE.DARKMODE);

    if (isDarkMode || inSystemDarkMode()) {
      $('html').addClass(darkClassName);
    }
  }
}

loadNow();

const gitMaster = new GitMaster();

gitMaster.init();
