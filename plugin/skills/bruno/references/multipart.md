# Multipart and form bodies

## Three spellings of one body type

| Where | Multipart | Form-urlencoded |
|---|---|---|
| Method block `body:` | `multipartForm` | `formUrlEncoded` |
| Body block | `body:multipart-form { }` | `body:form-urlencoded { }` |
| Inside `example.request` | `mode: multipartForm` and `body:multipart-form: { }` | `mode: formUrlEncoded` and `body:form-urlencoded: { }` |

Any other spelling of the body block (for example `body:multipart { }`) is a
parse error: `bru run` skips the whole file and still reports PASS.

## File upload

```bru
meta {
  name: Upload Avatar
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/users/:id/avatar
  body: multipartForm
  auth: inherit
}

params:path {
  id: 1
}

body:multipart-form {
  note: hello
  file: @file(fixtures/avatar.png)
}
```

- `@file(path)` sends the file as a real `multipart/form-data` part.
- A relative path resolves from the **collection root** (the folder with
  `bruno.json`), not from the `.bru` file's folder.
- **Never leave `@file()` empty**: the request fails with
  `EISDIR: illegal operation on a directory, read`.
- **Commit a small fixture** (for example `fixtures/avatar.png`, a few bytes) so
  the request runs for everyone, CI included.

## Form-urlencoded

```bru
meta {
  name: Token Exchange
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/oauth/token
  body: formUrlEncoded
  auth: none
}

body:form-urlencoded {
  grant_type: client_credentials
  scope: read
}
```

This sends `Content-Type: application/x-www-form-urlencoded` with the body
`grant_type=client_credentials&scope=read`.

## Examples for upload requests

Build an upload's `example { }` request fields from its `.bru` source, not from
a run report: `--reporter-json` records a multipart body as the form-data
library's internal object (`_streams`, `_overheadLength`, …), not as the field
list.

```bru
example {
  name: Uploaded
  description: Code-derived from the avatar upload handler

  request: {
    url: {{baseUrl}}/users/:id/avatar
    method: post
    mode: multipartForm
    params:path: {
      id: 1
    }
    body:multipart-form: {
      note: hello
      file: @file(fixtures/avatar.png)
    }
  }

  response: {
    status: {
      code: 201
      text: Created
    }
    body: {
      type: json
      content: '''
        {"id": 1, "avatarUrl": "/avatars/1.png"}
      '''
    }
  }
}
```
