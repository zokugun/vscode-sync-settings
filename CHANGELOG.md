# Changelog

## v0.17.0 | 2025-04-20
- better app restart, thanks to **@MeteorSkyOne**
- update dependencies

## v0.16.1 | 2025-01-27
- sort the extension list
- add an extra log on serialized resources
- remove the old path references

## v0.16.0 | 2023-03-17
- add existential operators (`?`, `!?`) to JSONC attributes
- improve error management

## v0.15.5 | 2023-03-14
- filter out empty hooks so the terminal isn't shown (it's now transient)
- catch errors on remote git so they can be shown in the output

## v0.15.4 | 2023-03-13
- fix the location of where the hooks are executed (in the local repository)
- add missing `syncSettings.deleteProfile` command

## v0.15.3 | 2023-03-12
- fix detection of an extension when its directory's name includes a target platform

## v0.15.2 | 2023-03-12
- correctly find binary due to "wsl" binary

## v0.15.1 | 2023-03-03
- fix management of extensions from VSIX Manager, thanks to **@manuth**

## v0.15.0 | 2022-12-25
- integrate [VSIX Manager](https://github.com/zokugun/vscode-vsix-manager)
- correctly find binary due to new "tunnel" binary

## v0.14.0 | 2022-11-24
- add `syncSettings.review` command: if any difference have been found, it will prompt if you would like to upload them
- add crons to automate the tasks `download`, `review` or `upload`

## v0.13.0 | 2022-09-25
- install extensions found the `data/extensions` directory of the profile
- add hooks to run commands before/after a download or an upload
- add support for remote but limited to only extensions
- fix error due to missing `profile.yml` when showing the differences

## v0.12.2 | 2022-08-17
- use specific version of `jsonc-parser` so `ncc` can bundle the extension without issue

## v0.12.1 | 2022-08-17
- fix `hostname` variable in git messages
- improve documentation about the `hostname` properties

## v0.12.0 | 2022-04-25
- add command to open the repository's local copy
- sort `ui-state.yml` by its keys
- fix showing the differences of an extended profile

## v0.11.0 | 2022-04-15
- add JSONC preprocessing rules: `rewrite-enable`, `rewrite-disable` and `rewrite-next-line`
- add JSONC attibute variables: `editorStorage`, `globalStorage` and `userStorage`
- add `~editorStorage` special path to `syncSettings.additionalFiles` setting
- revert to a default uuid if missing in an extension

## v0.10.0 | 2022-03-10
- add support for builtin extensions
- remove old files of newly excluded resources
- don't allow to synchronize `settings.yml`

## v0.9.0 | 2022-03-03
- add `syncSettings.additionalFiles` setting to synchronize external files
- validate data in `extensions.yml`

## v0.8.1 | 2022-02-25
- add settings `syncSettings.gitInitMessage`, `syncSettings.gitUpdateMessage` to share messages between computers
- add `syncSettings.hostname` setting to automatically generate the hostname

## v0.8.0 | 2022-02-21
- commit messages can be personalized
- display an alert when an error occurs
- default `settings.yml` contains an example and comments for all types of repository
- fix reloading settings when changed
- fix restart Visual Studio Code - Insiders
- improve error messages

## v0.7.0 | 2022-01-17
- add support for WebDAV
- add documentation for JSONC attributes and WebDAV

## v0.6.2 | 2021-10-21
- improve handling of missing settings files
- display a message when there is no differences

## v0.6.1 | 2021-10-14
- `.sync.yml` souldn't be required

## v0.6.0 | 2021-10-01
- add command to show the differences between the actual settings and the saved ones

## v0.5.1 | 2021-08-27
- improve activation events
- add capabilities

## v0.5.0 | 2021-08-24
- automatically reload the settings of the repository
- add icon

## v0.4.1 | 2021-08-24
- fix restart of Visual Studio Code on macOS
- fix downloading extensions on sub-profile

## v0.4.0 | 2021-08-24
- synchronize UI state
- synchronize disabled extensions

## v0.3.5 | 2021-08-22
- fix several bugs in sub-profile:
  - fix sync settings matching for non-primary value
  - editor which can't manage extensions, can't uninstall disabled extensions
  - fix matching snippets

## v0.3.4 | 2021-08-22
- fix hash calculation when multiple snippets

## v0.3.3 | 2021-08-22
- a sub-profile doesn't require a sync settings file

## v0.3.2 | 2021-08-22
- don't list badly uninstalled extension as full-fledged one

## v0.3.1 | 2021-08-22
- fix error when profile file is empty

## v0.3.0 | 2021-08-22
- add extended profile
- add command to open the profile's folder in the system file explorer

## v0.2.0 | 2021-08-12
- synchronize with `rsync`
- add alert when the synchronization is done
- add confirmation before any download/upload
- preprocess the files `settings.json` and `keybindings.json` based on the attributes found inside those files
- downloading is keeping the `syncSettings.ignoredSettings` and `#ignored` properties

## v0.1.1 | 2021-08-02
- fix extensions disabling in compatible editor

## v0.1.0 | 2021-08-02
- initial release
