const pkg = require('../../package.json');

const manifestInput = {
  manifest_version: 2,
  name: '__MSG_name__',
  short_name: 'Git Master',
  version: pkg.version,
  default_locale: 'en',
  icons: {
    16: 'assets/icons/favicon-16.png',
    32: 'assets/icons/favicon-32.png',
    48: 'assets/icons/favicon-48.png',
    128: 'assets/icons/favicon-128.png',
  },

  description: '__MSG_pluginDesc__',
  homepage_url: 'https://github.com/ineo6/git-master',

  permissions: ['activeTab', 'storage', 'alarms'],

  optional_permissions: [
    '<all_urls>',
    'webNavigation',
    'tabs',
    'notifications',
  ],

  web_accessible_resources: [
    '*.woff2',
    '*.png',
    '*.gif',
    'inject.js',
  ],

  content_security_policy: 'script-src \'self\' \'unsafe-eval\'; object-src \'self\'',

  '__chrome|firefox__author': 'neo',
  __opera__developer: {
    name: 'neo',
  },

  __firefox__applications: {
    gecko: { id: '{754FB1AD-CC3B-4856-B6A0-7786F8CA9D17}' },
  },

  __chrome__minimum_chrome_version: '49',
  __opera__minimum_opera_version: '36',

  browser_action: {
    default_popup: 'popup.html',
    default_icon: {
      16: 'assets/icons/favicon-16.png',
      32: 'assets/icons/favicon-32.png',
      48: 'assets/icons/favicon-48.png',
      128: 'assets/icons/favicon-128.png',
    },
    default_title: 'tiny title',
    '__chrome|opera__chrome_style': false,
    __firefox__browser_style: false,
  },

  '__chrome|opera__options_page': 'options.html',

  options_ui: {
    page: 'options.html',
    __chrome__chrome_style: true,
  },

  background: {
    scripts: ['js/background.bundle.js'],
    '__chrome|opera__persistent': true,
  },

  content_scripts: [
    {
      run_at: 'document_start',
      matches: [
        'https://github.com/*',
        'https://gitlab.com/*',
        '*://git.oschina.net/*',
        '*://gitee.com/*',
      ],
      js: ['js/contentScript.bundle.js'],
      css: [
        'css/contentScript.css',
      ],
    },
  ],
};

module.exports = manifestInput;
