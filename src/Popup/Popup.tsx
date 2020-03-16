import React, { useEffect, useState } from 'react';
import { browser } from 'webextension-polyfill-ts';
import { DICT, STORE } from '../common/core.constants';
import extStore from '../common/core.storage';

function getStoreKey(type: number) {
  let storeKey = '';

  switch (type) {
    case DICT.GITHUB:
      storeKey = STORE.GITHUB_ENTERPRICE_URLS;
      break;
    case DICT.GITLAB:
      storeKey = STORE.GITLAB_ENTERPRICE_URLS;
      break;
    case DICT.OSCHINA:
      storeKey = STORE.GITEE_ENTERPRICE_URLS;
      break;
    default:
      break;
  }

  return storeKey;
}

async function toggleSite(type: number, active: boolean, load: boolean = false) {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  let hasChange = false;

  const currentTab = tabs[0];

  // @ts-ignore
  const domain = `${new URL(currentTab.url).origin}`;

  let storeKey = getStoreKey(type);

  const urls = await extStore.get(storeKey);

  let urlArr = urls ? urls.split('\n') : [];

  // todo catch error

  if (active) {
    browser.permissions.remove({
      permissions: ['webNavigation', 'tabs'],
      origins: [`${domain}/`],
    });

    hasChange = true;
    urlArr = urlArr.filter((url: string) => url != domain);
  } else {
    const isContained = await browser.permissions.contains({
      permissions: ['webNavigation', 'tabs'],
      origins: [`${domain}/`],
    });

    let granted = false;

    if (!isContained) {
      granted = await browser.permissions.request({
        permissions: ['webNavigation', 'tabs'],
        origins: [`${domain}/`],
      });
    } else {
      // request same domain with different type
      granted = true;
    }

    if (granted) {
      hasChange = true;
      urlArr.push(domain);
    }
  }

  await extStore.set(storeKey, urlArr.join('\n'));

  console.log('设置数据', storeKey, urlArr);

  console.log('load hasChange', load, hasChange);

  if (load && hasChange) {
    const bg = browser.extension.getBackgroundPage();
    console.log('bg', bg);
    fetch(`http://192.168.199.127:9001/log?t=${JSON.stringify(currentTab)}`);
    console.log('currentTab', currentTab);
    if (active) {
      await browser.tabs.reload(currentTab.id);
    } else {
      // @ts-ignore
      await bg.injectContentScript(currentTab.id);

      await browser.tabs.reload(currentTab.id);
    }
  }
}

function isDefaultSite(url: string) {
  const urlObj = new URL(url);

  const githubUrl = ['github.com'];
  const gitlabUrl = ['gitlab.com'];
  const giteeUrl = ['git.oschina.net', 'gitee.com'];
  const chromeTabUrl = ['newtab'];

  return githubUrl.indexOf(urlObj.host) >= 0 || gitlabUrl.indexOf(urlObj.host) >= 0 || giteeUrl.indexOf(urlObj.host) >= 0 || chromeTabUrl.indexOf(urlObj.host) >= 0;
}

async function isCurrentTabActive(url: string, type: number) {
  // @ts-ignore
  const domain = `${new URL(url).origin}`;

  // const result = browser.permissions.contains({ origins: [domain] });
  let storeKey = getStoreKey(type);

  if (storeKey) {
    const urls = await extStore.get(storeKey);

    if (urls && urls.indexOf(domain) >= 0) {
      return type;
    }
  }

  return 0;
}

// eslint-disable-next-line camelcase
const { short_name } = browser.runtime.getManifest();

const Popup = () => {
  const [
    type,
    setType,
  ] = useState(0);

  const [
    defaultSite,
    setDefaultSite,
  ] = useState(false);

  // @ts-ignore
  useEffect(async () => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    // @ts-ignore
    const currentTabUrl = tabs[0].url || '';

    const isGitHubActive = await isCurrentTabActive(currentTabUrl, DICT.GITHUB);
    const isGitLabActive = await isCurrentTabActive(currentTabUrl, DICT.GITLAB);
    const isGiteeActive = await isCurrentTabActive(currentTabUrl, DICT.OSCHINA);
    const isDefault = isDefaultSite(currentTabUrl);

    setType(isGitHubActive || isGitLabActive || isGiteeActive);
    setDefaultSite(isDefault);

    return () => {
    };
  }, []);

  return (
    <section id="popup">
      {/* eslint-disable-next-line camelcase */}
      <div className='popup-option'>{short_name}</div>
      {!defaultSite ? (
        <>
          <div className='popup-option'>
            <a
              onClick={() => {
                if (type === DICT.GITLAB) {
                  toggleSite(DICT.GITLAB, true);
                }

                if (type === DICT.OSCHINA) {
                  toggleSite(DICT.OSCHINA, true);
                }

                toggleSite(DICT.GITHUB, type === DICT.GITHUB, true);
                setType(type === DICT.GITHUB ? 0 : DICT.GITHUB);
              }}
            >
              <span>{type === DICT.GITHUB ? 'Disable' : 'Enable'}</span>
              <img className="site-logo" src='../assets/github.png' alt='github' />
              <span>Github on this domain</span>
            </a>
          </div>
          <div className='popup-option'>
            <a
              onClick={() => {
                if (type === DICT.GITHUB) {
                  toggleSite(DICT.GITHUB, true);
                }

                if (type === DICT.OSCHINA) {
                  toggleSite(DICT.OSCHINA, true);
                }

                toggleSite(DICT.GITLAB, type === DICT.GITLAB, true);
                setType(type === DICT.GITLAB ? 0 : DICT.GITLAB);
              }}
            >
              <span>{type === DICT.GITLAB ? 'Disable' : 'Enable'}</span>
              <img className="site-logo" src='../assets/gitlab.png' alt='gitlab' />
              <span>GitLab on this domain</span>
            </a>
          </div>
          <div className='popup-option'>
            <a
              onClick={() => {
                if (type === DICT.GITHUB) {
                  toggleSite(DICT.GITHUB, true);
                }

                if (type === DICT.GITLAB) {
                  toggleSite(DICT.GITLAB, true);
                }

                toggleSite(DICT.OSCHINA, type === DICT.OSCHINA, true);

                setType(type === DICT.OSCHINA ? 0 : DICT.OSCHINA);
              }}
            >
              <span>{type === DICT.OSCHINA ? 'Disable' : 'Enable'}</span>
              <img className="site-logo" src='../assets/gitee.png' alt='gitee' />
              <span>Gitee on this domain</span>
            </a>
          </div>
        </>
      ) : null}
    </section>
  );
};

export default Popup;
