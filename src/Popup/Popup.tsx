import React, { useEffect, useState } from 'react';
import { browser } from 'webextension-polyfill-ts';
import { DICT, STORE } from '@/common/core.constants';
import extStore from '@/common/core.storage';
import Badge from '@/components/Badge';
import { getTabUrl } from '@/Background/lib/api';
import { openTab } from '@/Background/lib/tabs-service';
import { IEvent, GaEvent } from '@/common/analytics';

function report(ev: IEvent, opts: { action?: string; value?: number }) {
  const reportEvent = { ...ev };
  reportEvent.eventAction = opts.action || reportEvent.eventAction;
  reportEvent.eventValue = 'value' in opts ? opts.value : reportEvent.eventValue;

  browser.runtime.sendMessage({
    type: 'report',
    data: reportEvent,
  });
}

function getStoreKey(type: string) {
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
    case DICT.GITEA:
      storeKey = STORE.GITEA_ENTERPRICE_URLS;
      break;
    default:
      break;
  }

  return storeKey;
}

async function toggleSite(type: string, active: boolean, load: boolean = false) {
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

  if (load && hasChange) {
    await browser.tabs.reload(currentTab.id);
  }
}

function isDefaultSite(url: string) {
  const urlObj = new URL(url);

  const githubUrl = ['github.com'];
  const gitlabUrl = ['gitlab.com'];
  const giteeUrl = ['git.oschina.net', 'gitee.com'];
  const giteaUrl = ['try.gitea.io'];
  const chromeTabUrl = ['newtab'];

  return (
    githubUrl.indexOf(urlObj.host) >= 0 ||
    gitlabUrl.indexOf(urlObj.host) >= 0 ||
    giteeUrl.indexOf(urlObj.host) >= 0 ||
    giteaUrl.indexOf(urlObj.host) >= 0 ||
    chromeTabUrl.indexOf(urlObj.host) >= 0
  );
}

async function isCurrentTabActive(url: string, type: string) {
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

  return '';
}

// eslint-disable-next-line camelcase
const { short_name: shortName } = browser.runtime.getManifest();

const Popup = () => {
  const [type, setType] = useState('');

  const [defaultSite, setDefaultSite] = useState(false);

  const [badgeCount, setBadgeCount] = useState(null);

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
    const isGiteaActive = await isCurrentTabActive(currentTabUrl, DICT.GITEA);
    const isDefault = isDefaultSite(currentTabUrl);

    setType(isGitHubActive || isGitLabActive || isGiteeActive || isGiteaActive);
    setDefaultSite(isDefault);

    const badgeText = await browser.browserAction.getBadgeText({
      tabId: currentTab.id,
    });

    // @ts-ignore
    setBadgeCount(badgeText);

    return () => {};
  }, []);

  const handleGitHubNotify = async function() {
    await openTab(await getTabUrl());
  };

  return (
    <section id="popup">
      <div className="popup-title">
        <div>{shortName}</div>
        <div className="notify">
          <Badge count={badgeCount}>
            <a onClick={handleGitHubNotify} title="GitHub Notifications">
              <i className="masterfont master-icon-github" />
            </a>
          </Badge>
        </div>
      </div>
      {!defaultSite ? (
        <>
          <div className="popup-option">
            <a
              onClick={() => {
                if (type === DICT.GITLAB) {
                  toggleSite(DICT.GITLAB, true);
                }

                if (type === DICT.OSCHINA) {
                  toggleSite(DICT.OSCHINA, true);
                }

                if (type === DICT.GITEA) {
                  toggleSite(DICT.GITEA, true);
                }

                toggleSite(DICT.GITHUB, type === DICT.GITHUB, true);
                setType(type === DICT.GITHUB ? '' : DICT.GITHUB);

                report(GaEvent.SITE_ENABLE, {
                  action: 'github',
                  value: type === DICT.GITHUB ? 0 : 1,
                });
              }}
            >
              <img className="site-logo" src="../assets/github.png" alt="github" />
              <span>{type === DICT.GITHUB ? 'Disable' : 'Enable'}</span>
              <span>&nbsp;&nbsp;Github</span>
            </a>
          </div>
          <div className="popup-option">
            <a
              onClick={() => {
                if (type === DICT.GITHUB) {
                  toggleSite(DICT.GITHUB, true);
                }

                if (type === DICT.OSCHINA) {
                  toggleSite(DICT.OSCHINA, true);
                }

                if (type === DICT.GITEA) {
                  toggleSite(DICT.GITEA, true);
                }

                toggleSite(DICT.GITLAB, type === DICT.GITLAB, true);
                setType(type === DICT.GITLAB ? '' : DICT.GITLAB);

                report(GaEvent.SITE_ENABLE, {
                  action: 'gitlab',
                  value: type === DICT.GITLAB ? 0 : 1,
                });
              }}
            >
              <img className="site-logo" src="../assets/gitlab.png" alt="gitlab" />
              <span>{type === DICT.GITLAB ? 'Disable' : 'Enable'}</span>
              <span>&nbsp;&nbsp;GitLab</span>
            </a>
          </div>
          <div className="popup-option">
            <a
              onClick={() => {
                if (type === DICT.GITHUB) {
                  toggleSite(DICT.GITHUB, true);
                }

                if (type === DICT.GITLAB) {
                  toggleSite(DICT.GITLAB, true);
                }

                if (type === DICT.GITEA) {
                  toggleSite(DICT.GITEA, true);
                }

                toggleSite(DICT.OSCHINA, type === DICT.OSCHINA, true);

                setType(type === DICT.OSCHINA ? '' : DICT.OSCHINA);

                report(GaEvent.SITE_ENABLE, {
                  action: 'gitee',
                  value: type === DICT.OSCHINA ? 0 : 1,
                });
              }}
            >
              <img className="site-logo" src="../assets/gitee.png" alt="gitee" />
              <span>{type === DICT.OSCHINA ? 'Disable' : 'Enable'}</span>
              <span>&nbsp;&nbsp;Gitee</span>
            </a>
          </div>
          <div className="popup-option">
            <a
              onClick={() => {
                if (type === DICT.GITHUB) {
                  toggleSite(DICT.GITHUB, true);
                }

                if (type === DICT.GITLAB) {
                  toggleSite(DICT.GITLAB, true);
                }

                if (type === DICT.OSCHINA) {
                  toggleSite(DICT.OSCHINA, true);
                }

                toggleSite(DICT.GITEA, type === DICT.GITEA, true);

                setType(type === DICT.GITEA ? '' : DICT.GITEA);

                report(GaEvent.SITE_ENABLE, {
                  action: 'gitea',
                  value: type === DICT.GITEA ? 0 : 1,
                });
              }}
            >
              <img className="site-logo" src="../assets/gitea.png" alt="gitea" />
              <span>{type === DICT.GITEA ? 'Disable' : 'Enable'}</span>
              <span>&nbsp;&nbsp;Gitea</span>
            </a>
          </div>
        </>
      ) : null}
    </section>
  );
};

export default Popup;
