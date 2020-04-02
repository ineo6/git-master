import React, { useEffect, useState } from 'react';
import { browser } from 'webextension-polyfill-ts';
import { DICT, STORE } from '../common/core.constants';
import extStore from '../common/core.storage';
import Badge from '../components/Badge';
import { getTabUrl } from '../Background/lib/api';
import { openTab } from '../Background/lib/tabs-service';

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
    hasChange = true;
    urlArr = urlArr.filter((url: string) => url != domain);
  } else {
    hasChange = true;
    urlArr.push(domain);
  }

  await extStore.set(storeKey, urlArr.join('\n'));

  console.log('设置数据', storeKey, urlArr);

  console.log('load hasChange', load, hasChange);

  if (load && hasChange) {
    await browser.tabs.reload(currentTab.id);
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


  const [
    badgeCount,
    setBadgeCount,
  ] = useState(null);


  // @ts-ignore
  useEffect(async () => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    // @ts-ignore
    const currentTab = tabs[0] || {};

    const currentTabUrl = currentTab.url || '';

    const isGitHubActive = await isCurrentTabActive(currentTabUrl, DICT.GITHUB);
    const isGitLabActive = await isCurrentTabActive(currentTabUrl, DICT.GITLAB);
    const isGiteeActive = await isCurrentTabActive(currentTabUrl, DICT.OSCHINA);
    const isDefault = isDefaultSite(currentTabUrl);

    setType(isGitHubActive || isGitLabActive || isGiteeActive);
    setDefaultSite(isDefault);

    const badgeText = await browser.browserAction.getBadgeText({
      tabId: currentTab.id,
    });

    // @ts-ignore
    setBadgeCount(badgeText);

    return () => {
    };
  }, []);

  const handleGitHubNotify = async function() {
    await openTab(await getTabUrl());
  };

  return (
    <section id="popup">
      {/* eslint-disable-next-line camelcase */}
      <div className='popup-title'>
        <div>{short_name}</div>
        <div className="notify">
          <Badge count={badgeCount}>
            <a onClick={handleGitHubNotify}>
              <i className="masterfont master-icon-github" />
            </a>
          </Badge>
        </div>
      </div>
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
              <img className="site-logo" src='../assets/github.png' alt='github' />
              <span>{type === DICT.GITHUB ? 'Disable' : 'Enable'}</span>
              <span>&nbsp;&nbsp;Github</span>
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
              <img className="site-logo" src='../assets/gitlab.png' alt='gitlab' />
              <span>{type === DICT.GITLAB ? 'Disable' : 'Enable'}</span>
              <span>&nbsp;&nbsp;GitLab</span>
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
              <img className="site-logo" src='../assets/gitee.png' alt='gitee' />
              <span>{type === DICT.OSCHINA ? 'Disable' : 'Enable'}</span>
              <span>&nbsp;&nbsp;Gitee</span>
            </a>
          </div>
        </>
      ) : null}
    </section>
  );
};

export default Popup;
