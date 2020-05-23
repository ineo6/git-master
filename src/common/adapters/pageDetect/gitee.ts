import { getRepoPath } from './util';

const OSC_RESERVED_USER_NAMES = [
  'explore',
  'repositories',
  'popular',
  'enterprises',
  'gists',
  'dashboard',
  'languages',
  'search',
  'links',
  'invite',
  'profile',
  'organizations',
  'notifications',
  'login',
  'signup',
  'oauth',
];
const OSC_RESERVED_REPO_NAMES = [
  'admin',
  'dashboard',
  'groups',
  'help',
  'profile',
  'projects',
  'search',
  'codes',
  'fork_project',
  'fork_code',
  'events',
];

const OSC_EXTENSION_DOM = '.gitee-project-extension';
const GH_RAW_CONTENT = 'body > pre';

export const is404 = (): boolean => document.title === '你所访问的页面不存在 (404)';

export const isRawPage = function() {
  return $(GH_RAW_CONTENT).length >= 1;
};

export const isRepo = function() {
  // (username)/(reponame)[/(type)][/(typeId)]
  // eslint-disable-next-line no-useless-escape
  const match = window.location.pathname.match(/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?(?:\/([^\/]+))?/);
  if (!match) {
    return false;
  }

  const username = match[1];
  const reponame = match[2];

  // Not a repository, skip
  return !(~OSC_RESERVED_USER_NAMES.indexOf(username) || ~OSC_RESERVED_REPO_NAMES.indexOf(reponame));
};

export const shouldEnable = function() {
  if (is404()) {
    return false;
  }

  // 检测页面是否存在仓库扩展DOM
  if (!$(OSC_EXTENSION_DOM).length) {
    return false;
  }

  // Skip raw page
  if (isRawPage()) {
    return false;
  }

  // (username)/(reponame)[/(type)][/(typeId)]
  return isRepo();
};

// 判断是否是文件夹或者文件

export const isSingleFile = (): boolean => String(getRepoPath()).startsWith('blob/');

export const isFile = function() {
  return $('#tree-content-holder > .file_holder').length;
};

export const isFolder = function() {
  return $('.row.tree-item .octicon-mail-reply').length;
};
