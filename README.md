<h1 align="center">🚀 git-master</h1>
<p align="center">Git code tree extension.</p>
<h3 align="center">🙋‍♂️ Made by <a href="https://github.com/ineo6">neo</a></h3>

## Install

- [Chrome Web Store](https://chrome.google.com/webstore/detail/git-master/klmeolbcejnhefkapdchfhlhhjgobhmo)
- [Edge Web Store](https://microsoftedge.microsoft.com/addons/detail/pcpkfgepcjdmdfelbabogmgoadgmiocg)

## Features

- Git file tree (GitHub && GitLab && Gitee)
- File search
- GitHub notifications
- Browse the history of files (GitHub && GitLab)

## Settings

### Access Token

By default, GitMaster makes unauthenticated requests to get repository metadata. However, there are two situations when GitHub require such requests to be authenticated:

- You access a private repository
- You exceed the [API rate limit](https://developer.github.com/v3/#rate-limiting)

When that happens, GitMaster will ask for your [GitHub personal access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use). If you don't already have one, [create one](https://github.com/settings/tokens/new?scopes=repo&description=Git%20Master%20extension), then copy and paste it into the token textbox in the Settings screen. Note that the minimal scopes that should be granted are `public_repo` and `repo`.

However access token is not necessary to GitLab and Giteee. Cookie is used to make request.

**Access tokens are stored in the browser's local storage, only enter access tokens when you use a trusted computer.**

### Hotkeys

Hotkeys to pin or unpin the sidebar. You can enter multiple hotkeys by separating them with a comma.

- Supported modifiers: `⇧`, `shift`, `option`, `⌥`, `alt`, `ctrl`, `control`, `command`, and `⌘`.
- Supported special keys: `backspace`, `tab`, `clear`, `enter`, `return`, `esc`, `escape`, `space`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `del`, `delete` and `f1` through `f19`.

Learn more at [keymaster](https://github.com/madrobby/keymaster#supported-keys).

## Show your support

Give a ⭐️ if this project helped you!

## Licence

Code released under the [MIT License](LICENSE).
