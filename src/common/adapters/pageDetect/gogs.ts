import { getRepoPath } from './util';

export const GOGS_RESERVED_USER_NAMES = [
  'about',
  'account',
  'blog',
  'business',
  'contact',
  'dashboard',
  'developer',
  'explore',
  'features',
  'integrations',
  'issues',
  'join',
  'login',
  'new',
  'notifications',
  'open-source',
  'organizations',
  'orgs',
  'personal',
  'pricing',
  'pulls',
  'search',
  'security',
  'sessions',
  'settings',
  'showcases',
  'site',
  'stars',
  'styleguide',
  'topics',
  'trending',
  'user',
  'watching',
  'api',
  // gogs only
  'repo',
  'org',
];

export const GOGS_RESERVED_REPO_NAMES = ['followers', 'following', 'repositories'];

const RAW_CONTENT = 'body > pre';

export const is404 = (): boolean => $('img[alt=404]').length >= 1;

export const isRawPage = function() {
  return $(RAW_CONTENT).length >= 1;
};

export const isRepo = function() {
  // (username)/(reponame)[/(type)][/(typeId)]
  const match = window.location.pathname.match(/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?(?:\/([^\/]+))?/);
  if (!match) {
    return false;
  }

  const username = match[1];
  const reponame = match[2];

  // Not a repository, skip
  return !(~GOGS_RESERVED_USER_NAMES.indexOf(username) || ~GOGS_RESERVED_REPO_NAMES.indexOf(reponame));
};

export const shouldEnable = function() {
  if (is404()) {
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
