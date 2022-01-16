Sync Settings
=============

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/zokugun.sync-settings.svg)](https://marketplace.visualstudio.com/items?itemName=zokugun.sync-settings)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/zokugun.sync-settings.svg)](https://marketplace.visualstudio.com/items?itemName=zokugun.sync-settings)
[![License](https://img.shields.io/badge/donate-ko--fi-green)](https://ko-fi.com/daiyam)
[![License](https://img.shields.io/badge/donate-liberapay-green)](https://liberapay.com/daiyam/donate)
[![License](https://img.shields.io/badge/donate-paypal-green)](https://paypal.me/daiyam99)

With [Sync Settings](https://github.com/zokugun/vscode-sync-settings), you can synchronize your settings/resources across multiple devices.<br />
You can also switch between profiles with their own settings/resources.

HowTo
-----

1. configure the repository:

   > &gt; Sync Settings: Open the repository settings

2. upload your settings to the repository:
    > &gt; Sync Settings: Upload (user -> repository)

3. download your settings into a new editor:
    > &gt; Sync Settings: Download (repository -> user)

Configuration
-------------

### Repository

The repository is configured with the following file:

##### **`settings.yml`**
```yaml
hostname: ""
profile: main
repository:
  type: dummy
  path:
```

You can open that file with the command:

> &gt; Sync Settings: Open the repository settings

### Repository types

#### file

```yaml
repository:
  type: file
  path: ~/Development/settings
```

#### local git

```yaml
repository:
  type: git
  path: ~/Development/settings
  branch: master    # default
```

If not initialized, the git repository will be automatically initialized.

#### remote git

```yaml
repository:
  type: git
  url: git@github.com:username/settings.git
  branch: master    # default
```

The extension don't authentificate to access the remote repository, it's using the default `git` command (from the terminal).<br />
That `git` command will need write access to that repository.

#### rsync

```yaml
repository:
  type: rsync
  url: server:~/settings
  shell: ssh    # default
```

The access to the server shouldn't require the need of any passwords.

#### webdav

```yaml
repository:
  type: webdav
  url: http://localhost:9988/webdav/server
  username: webdav-user
  password: pa$$w0rd!
```

[More on WebDAV here](https://github.com/zokugun/vscode-sync-settings/blob/master/docs/webdav.md)

### Which resources?

You can configure what and how to synchronize with properties in your regular settings (`settings.json`).

- `"syncSettings.resources": ["extensions", "keybindings", "settings", "snippets", "uiState"]`
- `"syncSettings.ignoredExtensions": ["<extension's id>"]`
- `"syncSettings.ignoredSettings": ["editor.fontFamily"]`
- `"syncSettings.keybindingsPerPlatform": true`

Profiles
--------

Each profile has its own directory in the repository and can be configured independently of each other.

You can create a new profile with the command `> Sync Settings: Create a new profile`.<br />
Or switch to an existing one with the command `> Sync Settings: Switch to profile`.

### Profile Inheritance

A profile can extend an existing profile but it's limited to the following resources:
- extensions
- snippets

You can select the profile to extend from when creating a new profile (command `> Sync Settings: Create a new profile`).<br />
The command `> Sync Settings: Open the profile settings` will allow you to modify the property `extends`.

Commands
--------

- `> Sync Settings: Open the repository settings`: open the settings for configuring the repository
- `> Sync Settings: Upload (user -> repository)`: upload/copy the resources from the user to the repository
- `> Sync Settings: Download (repository -> user)`: download/copy the resources from the repository to the user
- `> Sync Settings: View differences between actual and saved settings`: display differences between the actual settings and the saved ones
- `> Sync Settings: Create a new profile`: create a new profile
- `> Sync Settings: Switch to profile`: switch to the selected profile
- `> Sync Settings: Open the profile settings`: open the settings for configuring the profile
- `> Sync Settings: Reveal the profile in the file explorer`: open the containing folder in the system file explorer
- `> Sync Settings: Remove all settings and extensions`: ⚠️⚠️ remove all your local resources ⚠️⚠️

JSONC Attributes
----------------

JSONC attributes can be used to enable/disable settings based on, for example, the OS or the editor's version.

### example

```json
{
    // #if(os="mac")
	// "editor.fontWeight": "300",
	// #elif(os="windows")
	// "editor.fontWeight": "400",
	// #else
	// "editor.fontWeight": "500",
	// #endif
}
```

When the `settings.json` is downloaded, depending on the OS, the setting `editor.fontWeight` will have the following value:

| OS      | `editor.fontWeight` |
| ------- |:-------------------:|
| Linux   |        `500`        |
| MacOS   |        `300`        |
| Windows |        `400`        |

[More details here](https://github.com/zokugun/vscode-sync-settings/blob/master/docs/attributes.md)

Donations
---------

Support this project by becoming a financial contributor.

<table>
    <tr>
        <td><img src="https://raw.githubusercontent.com/daiyam/assets/master/icons/256/funding_kofi.png" alt="Ko-fi" width="80px" height="80px"></td>
        <td><a href="https://ko-fi.com/daiyam" target="_blank">ko-fi.com/daiyam</a></td>
    </tr>
    <tr>
        <td><img src="https://raw.githubusercontent.com/daiyam/assets/master/icons/256/funding_liberapay.png" alt="Liberapay" width="80px" height="80px"></td>
        <td><a href="https://liberapay.com/daiyam/donate" target="_blank">liberapay.com/daiyam/donate</a></td>
    </tr>
    <tr>
        <td><img src="https://raw.githubusercontent.com/daiyam/assets/master/icons/256/funding_paypal.png" alt="PayPal" width="80px" height="80px"></td>
        <td><a href="https://paypal.me/daiyam99" target="_blank">paypal.me/daiyam99</a></td>
    </tr>
</table>

**Enjoy!**
