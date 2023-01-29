import { getRepoPath } from './util';

// gitea reserved user names: https://github.com/go-gitea/gitea/blob/release/v1.18/models/user/user.go#L580
const GT_RESERVED_USER_NAMES = [
  '.well-known',
  'admin',
  'api',
  'assets',
  'attachments',
  'avatar',
  'avatars',
  'captcha',
  'commits',
  'debug',
  'error',
  'explore',
  'favicon.ico',
  'ghost',
  'issues',
  'login',
  'manifest.json',
  'metrics',
  'milestones',
  'new',
  'notifications',
  'org',
  'pulls',
  'raw',
  'repo',
  'repo-avatars',
  'robots.txt',
  'search',
  'serviceworker.js',
  'ssh_info',
  'swagger.v1.json',
  'user',
  'v2',
];
const GH_RESERVED_REPO_NAMES = ['followers', 'following', 'repositories'];
const GH_404_SEL = '#parallax_wrapper';
const GH_RAW_CONTENT = 'body > pre';

export const is404 = (): boolean => document.title === 'Page not found · GitHub';

export const notPjax = function() {
  return !$(GH_404_SEL).length;
};

export const isRawPage = function() {
  return $(GH_RAW_CONTENT).length >= 1;
};

// export const isRepo = (): boolean => /^[^/]+\/[^/]+/.test(getCleanPathname()) &&
//   !reservedNames.includes(getOwnerAndRepo().ownerName!) &&
//   !isNotifications() &&
//   !isDashboard() &&
//   !isGist() &&
//   !isRepoSearch();

export const isRepo = function() {
  // (username)/(reponame)[/(type)][/(typeId)]
  const match = window.location.pathname.match(/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?(?:\/([^\/]+))?/);
  if (!match) {
    return false;
  }

  const username = match[1];
  const reponame = match[2];

  // Not a repository, skip
  return !(~GT_RESERVED_USER_NAMES.indexOf(username) || ~GH_RESERVED_REPO_NAMES.indexOf(reponame));
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
