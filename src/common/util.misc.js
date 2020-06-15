import { browser } from 'webextension-polyfill-ts';

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
    return new Promise((resolve, reject) => {
      fn[method](...args, res => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve(res);
        }
      });
    });
  };
}

// Regexps from https://github.com/shockie/node-iniparser
const INI_SECTION = /^\s*\[\s*([^\]]*)\s*\]\s*$/;
const INI_COMMENT = /^\s*;.*$/;
// eslint-disable-next-line no-useless-escape
const INI_PARAM = /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/;
const SEPARATOR = /\r\n|\r|\n/;

export function parseGitmodules(data) {
  if (!data) return;

  const submodules = {};
  const lines = data.split(SEPARATOR);
  let lastPath;

  lines.forEach(line => {
    let match;
    // eslint-disable-next-line no-cond-assign
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
  let total = arr.length;
  if (total === 0) return done();

  function finish() {
    if (--total === 0) done();
  }

  arr.forEach(item => {
    iter(item, finish);
  });
}

let $dummyDiv;

export function deXss(str) {
  $dummyDiv = $dummyDiv || $('<div></div>');

  return $dummyDiv.text(str).html();
}

export function convertSizeToHumanReadableFormat(bytes, digits = 2) {
  if (bytes === 0) {
    return {
      size: 0,
      measure: 'B',
    };
  }

  bytes *= 1024;

  const K = 1024;
  const MEASURE = ['', 'B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(K));

  return {
    // eslint-disable-next-line no-restricted-properties
    size: parseFloat((bytes / Math.pow(K, i)).toFixed(digits)),
    measure: MEASURE[i],
  };
}

export function getFileSizeAndUnit(data) {
  let formatBytes = convertSizeToHumanReadableFormat(data.size);
  let size = formatBytes.size;
  let unit = formatBytes.measure;

  return size + ' ' + unit;
}

window.isSafari = isSafari;
window.isValidTimeStamp = isValidTimeStamp;
