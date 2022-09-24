Remote
======

The extension can run in either client or server side.

When running on the client side (`ui`), only the data on the client (extensions, UI, ...) will be synchronized.<br />
When running on the server side (`workspace`), only the extensions available on the remote server will be synchronized.

It's recommanded to use a new profile for the server side (for example: `profile: remote`).

### Useful settings in `settings.json`
`remote.extensionKind`

- `remote.extensionKind`: https://code.visualstudio.com/api/advanced-topics/remote-extensions#common-problems
- `remote.SSH.defaultExtensions`: https://code.visualstudio.com/docs/remote/ssh#_always-installed-extensions
