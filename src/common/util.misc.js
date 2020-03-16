export function isSafari() {
  return typeof safari !== 'undefined' && safari.self && typeof safari.self.addEventListener === 'function';
}

export function isValidTimeStamp(timestamp) {
  // eslint-disable-next-line no-restricted-globals
  return !isNaN(parseFloat(timestamp)) && isFinite(timestamp);
}

export function promisify(fn, method) {
  if (typeof fn[method] !== 'function') {
    throw new Error(`promisify: fn does not have ${method} method`);
  }

  return function(...args) {
    return new Promise(((resolve, reject) => {
      fn[method](...args, (res) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(res);
        }
      });
    }));
  };
}

// Regexps from https://github.com/shockie/node-iniparser
const INI_SECTION = /^\s*\[\s*([^\]]*)\s*\]\s*$/;
const INI_COMMENT = /^\s*;.*$/;
const INI_PARAM = /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/;
const SEPARATOR = /\r\n|\r|\n/;

export function parseGitmodules(data) {
  if (!data) return;

  const submodules = {};
  const lines = data.split(SEPARATOR);
  let lastPath;

  lines.forEach((line) => {
    let match;
    if (INI_SECTION.test(line) || INI_COMMENT.test(line) || !(match = line.match(INI_PARAM))) {
      return;
    }

    if (match[1] === 'path') {
      lastPath = match[2];
    } else if (match[1] === 'url') submodules[lastPath] = match[2];
  });

  return submodules;
}

export function parallel(arr, iter, done) {
  var total = arr.length;
  if (total === 0) return done();

  arr.forEach((item) => {
    iter(item, finish);
  });

  function finish() {
    if (--total === 0) done();
  }
}

let $dummyDiv;

export function deXss(str) {
  $dummyDiv = $dummyDiv || $('<div></div>');

  return $dummyDiv.text(str)
    .html();
}

window.isSafari = isSafari;
window.isValidTimeStamp = isValidTimeStamp;
