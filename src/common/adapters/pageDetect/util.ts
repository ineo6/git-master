import {isRepo} from './github';

// Drops leading and trailing slash to avoid /\/?/ everywhere
export const getCleanPathname = (): string => location.pathname.replace(/^\/|\/$/g, '');

// Parses a repo's subpage, e.g.
// '/user/repo/issues/' -> 'issues'
// '/user/repo/' -> ''
// returns undefined if the path is not a repo
export const getRepoPath = (): string | undefined => {
  if (isRepo()) {
    return getCleanPathname().split('/').slice(2).join('/');
  }

  return undefined;
};
