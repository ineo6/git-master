export const NODE_PREFIX = 'gitmaster';
export const ADDON_CLASS = 'gitmaster';
export const SHOW_CLASS = 'gitmaster-show';
export const PINNED_CLASS = 'gitmaster-pinned';
export const SIDEBAR_RIGHT = 'gitmaster-sidebar-right';

export const STORE = {
  GITHUB_TOKEN: 'gitmaster.github_token.local',
  GITLAB_TOKEN: 'gitmaster.gitlab_token.local',
  GITEE_TOKEN: 'gitmaster.gitee_token.local',
  GITEA_TOKEN: 'gitmaster.gitea_token.local',
  GIST_TOKEN: 'gitmaster.gist_token.local',
  HOVEROPEN: 'gitmaster.hover_open',
  PR: 'gitmaster.prdiff_shown',
  HOTKEYS: 'gitmaster.hotkeys',
  ICONS: 'gitmaster.icons',
  LAZYLOAD: 'gitmaster.lazyload',
  POPUP: 'gitmaster.popup_shown',
  WIDTH: 'gitmaster.sidebar_width',
  SHOWN: 'gitmaster.sidebar_shown',
  PINNED: 'gitmaster.sidebar_pinned',
  HUGE_REPOS: 'gitmaster.huge_repos',
  GITHUB_ENTERPRICE_URLS: 'gitmaster.github_custom_url',
  GITLAB_ENTERPRICE_URLS: 'gitmaster.gitlab_custom_url',
  GITEE_ENTERPRICE_URLS: 'gitmaster.gitee_custom_url',
  GITEA_ENTERPRICE_URLS: 'gitmaster.gitea_custom_url',
  DIRECTION: 'gitmaster.direction',
  DARKMODE: 'gitmaster.dark_mode',
  FILESIZE: 'gitmaster.show_file_size',
  ANALYSIS: 'gitmaster.ga',
};

export const DICT = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  OSCHINA: 'gitee',
  GITEA: 'gitea',
  GIST: 'gist',
};

export const DEFAULTS = {
  GITHUB_TOKEN: '',
  GITLAB_TOKEN: '',
  GITEE_TOKEN: '',
  GITEA_TOKEN: '',
  GIST_TOKEN: '',
  HOVEROPEN: true,
  PR: true,
  LAZYLOAD: false,
  HOTKEYS: '⌘+⇧+s, ⌃+⇧+s',
  ICONS: true,
  POPUP: false,
  WIDTH: 232,
  SHOWN: false,
  PINNED: false,
  HUGE_REPOS: {},
  DIRECTION: 'left',
  DARKMODE: false,
  FILESIZE: true,
  ANALYSIS: true,
};

export const EVENT = {
  TOGGLE: 'gitmaster:toggle',
  TOGGLE_PIN: 'gitmaster:pin',
  LOC_CHANGE: 'gitmaster:location',
  LAYOUT_CHANGE: 'gitmaster:layout',
  REQ_START: 'gitmaster:start',
  REQ_END: 'gitmaster:end',
  STORE_CHANGE: 'gitmaster:storeChange',
  VIEW_READY: 'gitmaster:ready',
  VIEW_CLOSE: 'gitmaster:close',
  VIEW_SHOW: 'gitmaster:show',
  FETCH_ERROR: 'gitmaster:error',
  SIDEBAR_HTML_INSERTED: 'gitmaster:sidebarHtmlInserted',
  REPO_LOADED: 'gitmaster:repoLoaded',
};

export const MessageType = {
  PAGE_RENDERED: 'pageRendered',
};

window.STORE = STORE;
window.DEFAULTS = DEFAULTS;
window.EVENT = EVENT;
window.DICT = DICT;
