# Changelog

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
