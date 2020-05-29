import extStore from '@/common/core.storage';
import { DICT, STORE } from '@/common/core.constants';

export async function whichSite() {
  const currentUrl = `${window.location.protocol}//${window.location.host}`;

  const sites = {
    async isGitLab() {
      const customDomains = await extStore.get(STORE.GITLAB_ENTERPRICE_URLS);

      const domainArr = customDomains ? customDomains.split('\n') : [];

      const urls = ['https://gitlab.com'].concat(domainArr);

      return urls.indexOf(currentUrl) >= 0;
    },
    async isOsChina() {
      const customDomains = await extStore.get(STORE.GITEE_ENTERPRICE_URLS);

      const domainArr = customDomains ? customDomains.split('\n') : [];

      const urls = ['http://git.oschina.net', 'https://git.oschina.net', 'http://gitee.com', 'https://gitee.com'].concat(domainArr);

      return urls.indexOf(currentUrl) >= 0;
    },
    async isGitHub() {
      const customDomains = await extStore.get(STORE.GITHUB_ENTERPRICE_URLS);

      const domainArr = customDomains ? customDomains.split('\n') : [];

      const urls = ['https://github.com'].concat(domainArr);

      return urls.indexOf(currentUrl) >= 0;
    },
  };

  const isGitLab = await sites.isGitLab();
  const isOsChina = await sites.isOsChina();
  const isGitHub = await sites.isGitHub();

  if (isGitLab) {
    return DICT.GITLAB;
  } else if (isGitHub) {
    return DICT.GITHUB;
  } else if (isOsChina) {
    return DICT.OSCHINA;
  }

  return '';
}

export const inSystemDarkMode = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};
