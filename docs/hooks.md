Hooks
=====

The commands of a hook are executed in an integrated terminal of the editor.

By default, the terminal will work in the repository or its local copy if remote.

### `settings.json` (VSCode)

```jsonc
{
    "syncSettings.hooks.preDownload": (string | string[]),
    "syncSettings.hooks.postDownload": (string | string[]),
    "syncSettings.hooks.preUpload": (string | string[]),
    "syncSettings.hooks.postUpload": (string | string[]),
}
```

Recommanded, shareable between hosts.

### `settings.yaml` (Extension)

```yaml
hooks:
  pre-download: (string | string[])
  post-download: (string | string[])
  pre-upload: (string | string[])
  post-upload: (string | string[])
```
