Hostname
========

The hostname can be used to filter settings or in the commit message.

It can be configured in the extension's `settings.yml` or generated based on the `syncSettings.hostname` setting.

In **`settings.yml`**
--------------

```yaml
# current machine's name, optional
hostname: ""
```

That property needs to be deleted to be able to use the `syncSettings.hostname` setting.

In **`settings.json`**
----------------------

```json
"syncSettings.hostname": "{{hostname}}"
```

The hostname are generated using a very basic formatter.

A basic example is `Hello {{name}}!` which will result to `Hello all!` when the `name` variable equals `all`.

### Available Variables

| Name       | Description                  |
| ---------- | ---------------------------- |
| `hostname` | the `hostname` of the system |
| `username` | the `username` of the system |
