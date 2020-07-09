const detect = {
  isFirefox: navigator.userAgent.indexOf('Firefox'),
};

function bom(blob, opts) {
  if (typeof opts === 'undefined') {
    opts = { autoBom: false };
  } else if (typeof opts !== 'object') {
    console.warn('Deprecated: Expected third argument to be a object');
    opts = { autoBom: !opts };
  }

  // prepend BOM for UTF-8 XML and text/* types (including HTML)
  // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
  if (opts.autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
    return new Blob([String.fromCharCode(0xfeff), blob], { type: blob.type });
  }
  return blob;
}

function corsEnabled(url) {
  let xhr = new XMLHttpRequest();
  // use sync to avoid popup blocker
  xhr.open('HEAD', url, false);
  try {
    xhr.send();
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return xhr.status >= 200 && xhr.status <= 299;
}

// `a.click()` doesn't work for all browsers (#465)
function click(node) {
  try {
    node.dispatchEvent(new MouseEvent('click'));
  } catch (e) {
    let evt = document.createEvent('MouseEvents');
    evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
    node.dispatchEvent(evt);
  }
}

// Detect WebView inside a native macOS app by ruling out all browsers
// We just need to check for 'Safari' because all other browsers (besides Firefox) include that too
// https://www.whatismybrowser.com/guides/the-latest-user-agent/macos
let isMacOSWebView = /Macintosh/.test(navigator.userAgent) && /AppleWebKit/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent);

function saveDefault(blob, name, opts) {
  let URL = window.URL || window.webkitURL;
  let a = document.createElement('a');
  name = name || blob.name || 'download';

  a.download = name;
  a.rel = 'noopener'; // tabnabbing

  // TODO: detect chrome extensions & packaged apps
  // a.target = '_blank'

  if (typeof blob === 'string') {
    if (detect.isFirefox) {
      // eslint-disable-next-line no-use-before-define
      download(blob, name, opts);
    } else {
      // Support regular links
      a.href = blob;
      // eslint-disable-next-line no-restricted-globals
      if (a.origin !== location.origin) {
        // eslint-disable-next-line no-use-before-define
        corsEnabled(a.href) ? download(blob, name, opts) : click(a, (a.target = '_blank'));
      } else {
        click(a);
      }
    }
  } else {
    // Support blobs
    a.href = URL.createObjectURL(blob);
    setTimeout(function() {
      URL.revokeObjectURL(a.href);
    }, 4e4); // 40s
    setTimeout(function() {
      click(a);
    }, 0);
  }
}

function download(url, name, opts) {
  let xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.onload = function() {
    saveDefault(xhr.response, name, opts);
  };
  xhr.onerror = function() {
    console.error('could not download file');
  };
  xhr.send();
}

function saveAsMs(blob, name, opts) {
  name = name || blob.name || 'download';

  if (typeof blob === 'string') {
    if (corsEnabled(blob)) {
      download(blob, name, opts);
    } else {
      let a = document.createElement('a');
      a.href = blob;
      a.target = '_blank';
      setTimeout(function() {
        click(a);
      });
    }
  } else {
    navigator.msSaveOrOpenBlob(bom(blob, opts), name);
  }
}

function saveAsFailback(blob, name, opts, popup) {
  // Open a popup immediately do go around popup blocker
  // Mostly only available on user interaction and the fileReader is async so...
  popup = popup || window.open('', '_blank');
  if (popup) {
    // eslint-disable-next-line no-multi-assign
    popup.document.title = popup.document.body.innerText = 'downloading...';
  }

  if (typeof blob === 'string') return download(blob, name, opts);

  let force = blob.type === 'application/octet-stream';
  let isSafari = /constructor/i.test(window.HTMLElement) || window.safari;
  let isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);

  if ((isChromeIOS || (force && isSafari) || isMacOSWebView) && typeof FileReader !== 'undefined') {
    // Safari doesn't allow downloading of blob URLs
    let reader = new FileReader();
    reader.onloadend = function() {
      let url = reader.result;
      url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, 'data:attachment/file;');
      if (popup) {
        popup.location.href = url;
      } else {
        // eslint-disable-next-line no-restricted-globals
        location = url;
      }
      popup = null; // reverse-tabnabbing #460
    };
    reader.readAsDataURL(blob);
  } else {
    let URL = window.URL || window.webkitURL;
    let url = URL.createObjectURL(blob);
    if (popup) {
      popup.location = url;
    } else {
      // eslint-disable-next-line no-restricted-globals
      location.href = url;
    }
    popup = null; // reverse-tabnabbing #460
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 4e4); // 40s
  }
}

export default function saveAs(blob, name, opts, popup) {
  if ('download' in HTMLAnchorElement.prototype && !isMacOSWebView) {
    saveDefault(blob, name, opts);
  } else if ('msSaveOrOpenBlob' in navigator) {
    saveAsMs(blob, name, opts);
  } else {
    saveAsFailback(blob, name, opts, popup);
  }
}
