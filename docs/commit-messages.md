Commit Messages
===============

Commit messages are generated using a very basic formatter.

A basic example is `Hello {{name}}!` which will give `Hello all!` when the `name` variable is set to `all`.

Available Variables
-------------------

| Name       | Description                                       |
| ---------- | ------------------------------------------------- |
| `hostname` | the `hostname` property defined in `settings.yml` |
| `profile`  | the `profile` property defined in `settings.yml`  |
| `now`      | the current date                                  |

Date Formatter
--------------

Dates can be formated like:

- `{{now|date:iso}}` formats the date to an ISO string.
- `{{now|date:full,short:fr}}` formats the date using the [`Intl.DateTimeFormat` formatter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat).

    Possible formats:
    - `date:<dateStyle>,<timeStyle>:<locales>`
    - `date:<dateStyle>,<timeStyle>`
