# Contributing to GitMaster

## 初始化

安装依赖。

```bash
$ yarn

# or use yarn

$ npm i
```

## 开发模式

```bash
# Chrome、Edge
$ npm run dev:chrome
```

### 加载扩展

1. **更多工具** -> **扩展** 或者访问`chrome://extensions/`。

2. 点击 **'加载已解压的扩展程序'** (开发者模式
启用时可见)，然后选择文件夹 **'extensions/chrome'**。

![load-extension](https://i.loli.net/2020/10/30/yQukvV4BCPFmezX.png)

## 构建（生产模式）

```bash
# Chrome、Edge
$ npm run build:chrome
```

## 测试

none

## 项目结构

```
.
├── extension                                           构建结果（包含zip）
├── materiel
├── package.json
├── release.config.js
├── scripts
├── src
│   ├── Background
│   ├── ContentScript
│   │   ├── PageLife
│   │   ├── codeTree.ts                                 content script 入口
│   │   ├── feature                                     页面自动注入的功能特性
│   │   ├── index.less
│   │   ├── index.ts
│   │   ├── theme                                       黑暗模式样式
│   │   └── util.ts
│   ├── Options
│   ├── Popup
│   ├── assets
│   ├── common
│   │   ├── adapters                                    代码树的各个适配器
│   │   │   ├── adapter.js                              适配器核心代码
│   │   │   ├── gist.js
│   │   │   ├── gitea.js
│   │   │   ├── github.js
│   │   │   ├── github.less
│   │   │   ├── gitlab.js
│   │   │   ├── gitlab.less
│   │   │   ├── octicons
│   │   │   ├── oschina.js
│   │   │   ├── oschina.less
│   │   │   ├── pageDetect
│   │   │   └── pjax.js
│   │   ├── libs
│   │   ├── styles
│   │   ├── template
│   │   │   ├── template-full.html
│   │   │   ├── template.html
│   │   │   └── template.js
│   │   ├── util.deXss.js
│   │   ├── util.ext.js
│   │   ├── util.misc.js
│   │   ├── util.plugins.js
│   │   ├── view.error.js
│   │   ├── view.help.js
│   │   ├── view.options.js
│   │   └── view.tree.js
│   ├── components
│   ├── manifest
│   └── styles
├── typings
├── views
│   ├── _locales
│   ├── assets
│   ├── inject.js
│   ├── libs
│   ├── options.html
│   └── popup.html
├── webpack.config.js
```

## Git提交消息格式

我们的提交信息有明确的格式要求，统一、规范的提交会让提交历史更易于阅读 。

每一个提交包含`header`,`body`,`footer`三部分，`header`是一定要填写的，`body`和`footer`是可选的。

```
<header>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

其中每一行信息都不超超过100个字符。

### Header

```
<type>: <short summary>
  │        │
  │        └─⫸ 提交内容的概要描述，末尾不需要标点符号。
  │
  └─⫸ 提交类型: build|chore|ci|docs|feat|fix|perf|refactor|style|test|style|revert
```

#### Type

可选项:

* **chore**: 除了src或test以外的改动
* **ci**: CI配置或脚本的改动 (比如: Circle, BrowserStack, SauceLabs)
* **docs**: 文档内容的改动
* **feat**: 新的功能
* **fix**: 问题修复
* **perf**: 提交性能的改动的代码变动
* **refactor**: 除了修复bug和增加功能的代码改动
* **test**: 测试用例的改动
* **style**: 代码格式的改动(空格, 格式, 分号等等)
* **revert**: 还原提交

#### Summary

用一句话简单说明自此改动的内容:

* 使用祈使句，现在时: "change" 而不是 "changed" 或者 "changes"
* 第一个字母不需要大写
* 不需要用句号结尾

## 发布

```bash
$ npm run release
```
