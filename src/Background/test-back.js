// WARNING! This file contains some subset of JS that is not supported by type inference.
// You can try checking 'Transpile to ES5' checkbox if you want the types to be inferred
'use strict';
const requestPermissionAsync = promisify(chrome.permissions.request);
const removePermissionAsync = promisify(chrome.permissions.remove);
const containsPermissionAsync = promisify(chrome.permissions.contains);
const createMenuAsync = promisify(chrome.contextMenus.create);
const removeMenuAsync = promisify(chrome.contextMenus.remove);
const PRO_ACTIVATE_ENTERPRISE_MESSAGE = 'octotree_pro_activate_enterprise_call';
const PRO_DEACTIVATE_ENTERPRISE_MESSAGE = 'octotree_pro_deactivate_enterprise_call';
let isCreated = false;
let injectionHookRegistered = false;

function removeMenu() {
  const {
    name: dataEndpointName,
  } = chrome.runtime.getManifest();
  removeMenuAsync(`${dataEndpointName}:add-permission`);
  removeMenuAsync(`${dataEndpointName}:remove-permission`);
}

function createMenu() {
  const {
    name: dataEndpointName,
  } = chrome.runtime.getManifest();
  createMenuAsync({
    id: `${dataEndpointName}:add-permission`,
    title: `Enable ${dataEndpointName} on this domain`,
    contexts: ['page_action', 'browser_action'],
    documentUrlPatterns: ['http://*/*', 'https://*/*'],
    onclick: async (event, options) => {
      let {
        tabId: key,
        id: article,
        url: url,
      } = options;
      if (!key) {
        key = article;
      }
      const host = `${(new URL(url)).origin}/*`;
      if (await requestPermissionAsync({
        permissions: ['webNavigation', 'tabs'],
        origins: [host],
      })) {
        registerInjectionHook();
        promisify(chrome.tabs.reload)(key);
      }
    },
  });
  createMenuAsync({
    id: `${dataEndpointName}:remove-permission`,
    title: `Disable ${dataEndpointName} on this domain`,
    contexts: ['page_action', 'browser_action'],
    documentUrlPatterns: ['http://*/*', 'https://*/*'],
    onclick: async (event, options) => {
      let {
        tabId: key,
        id: article,
        url: url,
      } = options;
      if (!key) {
        key = article;
      }
      const domain = `${(new URL(url)).origin}/*`;
      if (!isGitHub(domain) && await containsPermissionAsync({
        origins: [domain],
      })) {
        if (await removePermissionAsync({
          origins: [domain],
        })) {
          promisify(chrome.tabs.reload)(key);
        }
      }
    },
  });
}

function registerInjectionHook() {
  if (!injectionHookRegistered && chrome.webNavigation) {
    injectionHookRegistered = true;
    chrome.webNavigation.onCommitted.addListener(async ({
      tabId: list,
      frameId: frameId,
    }) => {
      const renderSubNavigationList = promisify(chrome.tabs.get);
      const injector = promisify(chrome.tabs.executeScript);
      const load = promisify(chrome.tabs.insertCSS);
      if (0 !== frameId) {
        return;
      }
      let {
        url: url,
      } = await renderSubNavigationList(list);
      if (!url) {
        try {
          if (!(url = (await injector(list, {
            code: 'window.location.href;',
            runAt: 'document_start',
          }))[0])) {
            return;
          }
        } catch (e) {
          return;
        }
      }
      const domain = `${(new URL(url)).origin}/*`;
      if (isGitHub(domain) || isOctotreeWeb(domain)) {
        return;
      }
      if (!domain.toLowerCase()
        .startsWith('http')) {
        return;
      }
      if (!await containsPermissionAsync({
        origins: [domain],
      })) {
        return;
      }
      const deps = chrome.runtime.getManifest().content_scripts;
      for (const depPkgUri of deps) {
        const {
          all_frame: name,
          run_at: run_at,
          css: source,
          js: js,
        } = depPkgUri;
        source.forEach((data_uri) => {
          return load(list, {
            file: data_uri,
            allFrames: name,
            runAt: run_at,
          });
        });
        js.forEach((data_uri) => {
          return injector(list, {
            file: data_uri,
            allFrames: name,
            runAt: run_at,
          });
        });
      }
    });
  }
}

function promisify(originalMethod) {
  return (...args) => {
    return new Promise((log, done) => {
      const callback = (e) => {
        if (chrome.runtime.lastError) {
          done(chrome.runtime.lastError);
        } else {
          log(e);
        }
      };
      const promise = originalMethod(...args, callback);
      if (promise && promise.then) {
        promise.then(callback);
      }
    });
  };
}

function isGitHub(url) {
  return 'https://github.com/*' === url;
}

function isOctotreeWeb(data) {
  return 'https://www.octotree.io/*' === data;
}

chrome.runtime.onMessage.addListener((options) => {
  if (options.eventName !== PRO_ACTIVATE_ENTERPRISE_MESSAGE || isCreated) {
    if (options.eventName === PRO_DEACTIVATE_ENTERPRISE_MESSAGE && isCreated) {
      removeMenu();
      isCreated = false;
    }
  } else {
    createMenu();
    isCreated = true;
  }
}), registerInjectionHook();
const apiBaseUrl = 'https://www.octotree.io/api/v1.0';
const PRO_WEBSITE_MESSAGE_NAME = 'octotree_pro_auth_call';

async function sendRequest(callback, options) {
  try {
    const {
      path: id,
      token: data,
      body: body,
      method: name,
    } = options;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (data) {
      headers.Authorization = `Bearer ${data}`;
    }
    const response = await fetch(`${apiBaseUrl}/${id.replace(/^\//, '')}`, {
      headers: headers,
      body: body,
      method: name,
    });
    const instanceFillValue = response.headers.get('Content-Type');
    let error;
    if (error = /application\/json/i.test(instanceFillValue) ? await response.json() : await response.text(), !response.ok) {
      const _response = new Error(error.message || error.statusText || error);
      throw _response.statusCode = response.status, _response;
    }
    callback({
      responseBody: error,
      responseStatus: response.status,
    });
  } catch (alertlog) {
    callback({
      message: alertlog.message,
      statusCode: alertlog.statusCode,
    });
  }
}

chrome.runtime.onMessage.addListener((data, canCreateDiscussions, url) => {
  if ('octotree_pro_auth_call' === data.eventName) {
    return sendRequest(url, data), true;
  }
  url();
}), chrome.runtime.setUninstallURL('https://www.octotree.io/feedback');
