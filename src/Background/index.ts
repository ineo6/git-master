import { browser } from 'webextension-polyfill-ts';
import delay from 'delay';
import { MessageType } from '@/common/core.constants';
import Analytics from '@/common/analytics';
import optionsStorage from './options-storage';
import localStore from './lib/local-store';
import { openTab } from './lib/tabs-service';
import { queryPermission } from './lib/permissions-service';
import { getNotificationCount, getTabUrl } from './lib/api';
import { renderCount, renderError, renderWarning } from './lib/badge';
import { checkNotifications, openNotification } from './lib/notifications-service';
import { isChrome, isNotificationTargetPage } from './util';

let currentUrl = '';
let tabId: number;
const ga = new Analytics();

ga.initialize('UA-39288503-7');

browser.runtime.onInstalled.addListener((details): void => {
  const manifest = browser.runtime.getManifest();
  if (details.reason === 'install') {
    ga.sendEvent(ga.event.INSTALLED, 'installed', manifest.version);
  } else if (details.reason === 'update') {
    ga.sendEvent(ga.event.UPDATED, 'updated', `${details.previousVersion}=>${manifest.version}`);
  }
});

async function scheduleNextAlarm(interval?: number) {
  const intervalSetting = (await localStore.get('interval')) || 60;
  const intervalValue = interval || 60;

  if (intervalSetting !== intervalValue) {
    localStore.set('interval', intervalValue);
  }

  // Delay less than 1 minute will cause a warning
  const delayInMinutes = Math.max(Math.ceil(intervalValue / 60), 1);

  browser.alarms.create({ delayInMinutes });
}

async function handleLastModified(newLastModified: any) {
  const lastModified = (await localStore.get('lastModified')) || new Date(0);

  // Something has changed since we last accessed, display any new notificaitons
  if (newLastModified !== lastModified) {
    const { showDesktopNotif, playNotifSound } = await optionsStorage.getAll();
    // @ts-ignore
    if (showDesktopNotif === true || playNotifSound === true) {
      await checkNotifications(lastModified);
    }

    await localStore.set('lastModified', newLastModified);
  }
}

async function updateNotificationCount() {
  const response = await getNotificationCount();
  const { count, interval, lastModified } = response;

  renderCount(count);
  scheduleNextAlarm(interval);
  handleLastModified(lastModified);
}

function handleError(error: any) {
  scheduleNextAlarm();

  renderError(error);
}

function handleOfflineStatus() {
  renderWarning('offline');

  // Keep schedule for next alarm to keep background active
  scheduleNextAlarm();
}

async function update() {
  if (navigator.onLine) {
    try {
      await updateNotificationCount();
    } catch (error) {
      handleError(error);
    }
  } else {
    handleOfflineStatus();
  }
}

async function handleBrowserActionClick() {
  await openTab(await getTabUrl());
}

function handleInstalled(details: any) {
  if (details.reason === 'install') {
    browser.runtime.openOptionsPage();
  }
}

function handleConnectionStatus() {
  if (navigator.onLine) {
    update();
  } else {
    handleOfflineStatus();
  }
}

// @ts-ignore
async function onTabUpdated(tabId: any, changeInfo: any, tab: any) {
  if (changeInfo.status !== 'complete') {
    return;
  }

  if (await isNotificationTargetPage(tab.url)) {
    await delay(1000);
    await update();
  }
}

async function addHandlers() {
  const { updateCountOnNavigation } = await optionsStorage.getAll();

  if (await queryPermission('notifications')) {
    browser.notifications.onClicked.addListener(id => {
      openNotification(id);
    });
  }

  if (await queryPermission('tabs')) {
    if (updateCountOnNavigation) {
      browser.tabs.onUpdated.addListener(onTabUpdated);
    } else {
      browser.tabs.onUpdated.removeListener(onTabUpdated);
    }
  }
}

function handleUrlLoad() {
  browser.webRequest.onCompleted.addListener(
    function(details) {
      const parsedUrl = new URL(details.url);

      if (currentUrl && currentUrl.indexOf(parsedUrl.pathname) > -1 && tabId) {
        browser.tabs.sendMessage(tabId, { type: MessageType.PAGE_RENDERED });
      }
    },
    { urls: ['*://*.github.com/*'] }
  );

  browser.webNavigation.onHistoryStateUpdated.addListener(
    details => {
      tabId = details.tabId;
      currentUrl = details.url;
    },
    {
      url: [
        {
          hostSuffix: 'github.com',
        },
      ],
    }
  );
}

async function onMessage(message: { type: String; data?: any; tabId?: number }) {
  if (message.type === 'update') {
    await addHandlers();
    await update();
  } else if (message.type === 'report') {
    // report to ga
    ga.sendEvent(message.data);
  }
}

function init() {
  window.addEventListener('online', handleConnectionStatus);
  window.addEventListener('offline', handleConnectionStatus);

  browser.alarms.onAlarm.addListener(update);
  browser.alarms.create({ when: Date.now() + 2000 });

  browser.runtime.onMessage.addListener(onMessage);
  browser.runtime.onInstalled.addListener(handleInstalled);

  // Chrome specific API
  if (isChrome()) {
    // @ts-ignore
    browser.permissions.onAdded.addListener(addHandlers);
  }

  browser.browserAction.onClicked.addListener(handleBrowserActionClick);

  addHandlers();
  update();
  handleUrlLoad();
}

init();
