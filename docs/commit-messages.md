Commit Messages
===============

It's recommended to configure your personnalized commit messages in the `settings.json` so they can be shared between your hosts.

### `settings.json` (VSCode)

```json
{
    // commit message used when initializing a new profile, optional (set to `profile({{profile}}): init -- {{now|date:iso}}` by default)
    "syncSettings.gitInitMessage": "profile({{profile}}): init -- {{now|date:iso}}",
    // commit message used when updating a profile, optional (set to `profile({{profile}}): update -- {{now|date:iso}}` by default)
    "syncSettings.gitUpdateMessage": "profile({{profile}}): update -- {{now|date:iso}}"
}
```

Recommended, shareable between hosts.

### `settings.yaml` (Extension)

```yaml
# sync on git
repository:
  type: git

  # commit messages used when initializing or updating a profile, optional
  messages:
    # commit message used when initializing a new profile, optional (set to `profile({{profile}}): init -- {{now|date:iso}}` by default)
    init: 'profile({{profile}}): init -- {{now|date:iso}}'
    # commit message used when updating a profile, optional (set to `profile({{profile}}): update -- {{now|date:iso}}` by default)
    update: 'profile({{profile}}): update -- {{now|date:iso}}'
```

Non-shareable, specific to a host.

Format
------

Commit messages are generated using a very basic formatter.

A basic example is `Hello {{name}}!` which will result to `Hello all!` when the `name` variable equals `all`.

Available Variables
-------------------

<table>
<tr>
<th>Name</th>
<th>Description</th>
</tr>
<tr>
<td>

`hostname`
</td>
<td>

- the `hostname` property from `settings.yml`
- if empty, the `syncSettings.hostname` property in `settings.json`
</td>
</tr>
<tr>
<td>

`profile`
</td>
<td>

the `profile` property from `settings.yml`
</td>
</tr>
<tr>
<td>

`now`
</td>
<td>

the current date
</td>
</tr>
</table>

[How to configure the `hostname` property](https://github.com/zokugun/vscode-sync-settings/blob/master/docs/hostname.md)

Date Formatter
--------------

Dates can be formated like:

- `{{now|date:iso}}` formats the date to an ISO string.
- `{{now|date:full,short:fr}}` formats the date using the [`Intl.DateTimeFormat` formatter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat).

    Possible formats:
    - `date:<dateStyle>,<timeStyle>:<locales>`
    - `date:<dateStyle>,<timeStyle>`
