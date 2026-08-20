Webdav
======

```yaml
repository:
   type: webdav
   url: http://localhost:9988/webdav/server
   username: webdav-user
   password: pa$$w0rd!
```

Working Directory
-----------------

The working directory on the WebDAV needs to be initialy empty.<br />
On the first connection, the extension will create the file `.vsx`.<br />
On the others connections, it will read and validate the content of that file. If the validation failed, the extension will stop.

Options
-------

| Option             | Default | Description                                                                                                                               |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `authType`         | `null`  | The authentication type to use. If not provided, defaults to trying to detect based upon whether `username` and `password` were provided. |
| `headers`          | `{}`    | Additional headers provided to all requests. Headers provided here are overridden by method-specific headers, including `Authorization`.  |
| `agent`            | *None*  | HTTP(S) agent instance. Available only in Node. See [https.Agent](https://nodejs.org/api/https.html#https_class_https_agent).             |
| `maxBodyLength`    | *None*  | Maximum body length allowed for sending, in bytes.                                                                                        |
| `maxContentLength` | *None*  | Maximum content length allowed for receiving, in bytes.                                                                                   |
| `password`         | *None*  | Password for authentication.                                                                                                              |
| `token`            | *None*  | Token object for authentication.                                                                                                          |
| `username`         | *None*  | Username for authentication.                                                                                                              |
| `withCredentials`  | *None*  | Credentials inclusion setting for Axios.                                                                                                  |
| `ignoreTLSErrors`  | `false` | If true, continues over secure connections even if identity checks fail.                                                                  |

Common Errors
-------------

### Error: Certificate has Expired

In some case, the certificate can't be validated due to issue with the root CA. In that case, use `ignoreTLSErrors: true` to continue the connection.
