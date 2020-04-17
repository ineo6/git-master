import GitMaster from './PageLife/core/GitMaster'
import LifecyclePlugins from './PageLife/lib/LifecyclePlugins'

export type Lit = string | number | boolean | undefined | null | void | {};
export const tuple = <T extends Lit[]>(...args: T) => args;

/**
 * for plugin config
 */
interface PluginConfig {
  name: string
  type: string
  required: boolean
  default?: any

  [propName: string]: any
}

/**
 * for lifecycle plugins
 */
interface Helper {
  beforeDocumentLoadedPlugins: LifecyclePlugins
  documentLoadedPlugins: LifecyclePlugins
  injectPlugins: LifecyclePlugins
  afterPlugins: LifecyclePlugins
}

/**
 * for config options
 */
interface Config {
  [propName: string]: any
}

/**
 * for plugin
 */
interface Plugin {
  handle(ctx: GitMaster): void | Promise<any>

  [propName: string]: any
}

/**
 * for spawn output
 */
interface Result {
  code: string | number
  data: string
}

/**
 * for initUtils
 */
interface Options {
  template: string // template name
  dest: string // destination for template to generate
  hasSlash: boolean // check if is officail template
  inPlace: boolean // check if is given project name
  clone: boolean // check if use git clone
  offline: boolean // check if use offline mode
  tmp: string // cache template
  project: string // project name
}

/**
 * for clipboard image
 */
interface ClipboardImage {
  imgPath: string
  isExistFile: boolean
}

const FileTypes = tuple('submodule', 'file', 'directory');

export type FileType = typeof FileTypes[number];

export interface IGitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: object;
  type: string;
  _links: ILinks;
}

export interface ILinks {
  self: string;
  git: string;
  html: string;
}

export {
  PluginConfig,
  Config,
  Helper,
  Plugin,
  Result,
  Options,
  ClipboardImage
}
