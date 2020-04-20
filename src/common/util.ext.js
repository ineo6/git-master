import { browser } from 'webextension-polyfill-ts';

// 向页面注入JS
export function injectCustomJs(jsPath) {
  jsPath = jsPath || 'inject.js';
  const temp = document.createElement('script');
  temp.setAttribute('type', 'text/javascript');
  // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
  temp.src = browser.extension.getURL(jsPath);
  temp.onload = function() {
    // 放在页面不好看，执行完后移除掉
    this.parentNode.removeChild(this);
  };
  document.body.appendChild(temp);
}

// eslint-disable-next-line
var pageId = 'content';

window.addEventListener('message', (e) => {
  if (e.data.from === pageId) {
    return;
  }

  if (e.data && e.data.cmd === 'invoke') {
    eval('(' + e.data.code + ')');
  } else if (e.data && e.data.cmd === 'message') {
    console.log(e.data.data);
  }
}, false);

export function sendMessageToContentScriptByPostMessage(data) {
  window.postMessage({
    cmd: 'message',
    data: data,
    from: pageId,
  }, '*');
}

export function i18n() {
  Array.from(document.querySelectorAll('[data-i18n]'))
    .forEach((e) => {
      if (e.dataset.i18nType) {
        e.setAttribute(e.dataset.i18nType, browser.i18n.getMessage(e.dataset.i18n));
      } else {
        e['value' in e && e.tagName !== 'BUTTON' ? 'innerHTML' : 'innerHTML'] = browser.i18n.getMessage(e.dataset.i18n);
      }
    });
}
