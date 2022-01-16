JSONC Attributes
================

Upload/Download
---------------

### Upload

On upload, all identified blocks will be commented

So if locally, you have:
```
{
    // #enable(os="linux")
    "key": "foobar"
}
```

The following will be uploaded to the repository:
```
{
    // #enable(os="linux")
    // "key": "foobar"
}
```

### Download

When downloaded, the `settings.json` is processed to enable/uncommented all lines/blocks when the condition are true.

Variables
---------

| Variable   | Description                                                                               |
| ---------- | ----------------------------------------------------------------------------------------- |
| `hostname` | The hostname found in `settings.yml`                                                      |
| `profile`  | The profile used to sync                                                                  |
| `os`       | `linux`, `mac` or `windows`                                                               |
| `editor`   | `visual studio code`, `vscodium`, `mrcode` or the lowercased `nameLong` in `product.json` |
| `version`  | the version of the editor                                                                 |
| `<ENV>`    | all env variables are directly available, like `EDITOR` => `#if(EDITOR="vi")`             |

Blocks
------

### `enable`

```
{
    // #enable(os="linux")
    // "key": "foobar"
}
```

If `os` is equal to `linux`, the block `"key": "foobar"` will be uncommented.

### `if/else`

```
{
    // #if(os="mac")
    // "key": "foo"
    // #elif(os="windows", host="host1"|"host2")
    // "key": "bar"
    // #elif(version>="1.59.0")
    // "key": "qux"
    // #else
    // "key": "baz"
    // #endif
}
```

`#elif(os="windows", host="host1"|"host2")` is `true` when `os` equals `windows` ***and*** `host` equals `host1` or `host2`.<br />
`#elif(os="windows", version>="1.59.0")` is `true` when `version` is greater than or equal to `1.59.0`.

### `ignore`

The property won't be uploaded and is kept when downloading a new `settings.json`.

```
{
    // #ignore
    "key": "foobar"
}
```

Condition
---------

```
condition = expression ("," expression)*
expression = identifier operator values
identifier = \w+
operator = "=" | "!=" | "<" | "<=" | ">" | ">="
values = value ("|" value)*
```

`value` is a double quote string.<br />
The operators `<`, `<=`, `>`, `>=` are only working for the identifier `version`.

