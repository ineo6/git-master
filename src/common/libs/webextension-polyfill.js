/* eslint-disable */
if (typeof browser === 'undefined' || Object.getPrototypeOf(browser) !== Object.prototype) {
  module.exports = require('webextension-polyfill-origin');
} else {
  module.exports = browser;
}
