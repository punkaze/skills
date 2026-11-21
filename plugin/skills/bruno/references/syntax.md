# `.bru` syntax

The core rules (the `url:` line is what gets sent, `params:query`,
`params:path`, `auth: inherit`) are in SKILL.md. This file has the full shapes.

## A request file

```bru
meta {
  name: Get User
  type: http
  seq: 1
  tags: [
    smoke
  ]
}

get {
  url: {{baseUrl}}/users/:id?expand=profile
  body: none
  auth: inherit
}

params:path {
  id: 1
}

params:query {
  expand: profile
}

headers {
  Accept: application/json
}

body:json {
  {
    "name": "John"
  }
}

script:post-response {
  if (res.status >= 200 && res.status < 300 && res.body && res.body.token) {
    bru.setVar("authToken", res.body.token);
  }
}

tests {
  test("status is 200", function() {
    expect(res.status).to.equal(200);
  });
}

docs {
  Retrieve a single user by id.
}
```

**Tags use the multi-line list form above.** A one-line `tags: [smoke]` parses
as the string `"[smoke]"`, so `--tags` and `--exclude-tags` silently ignore the
request.

## Collection-level auth — collection.bru

`auth: inherit` resolves against `collection.bru` at the collection root (or a
folder's `folder.bru`). **Without it, "inherited" requests send no auth at all:**

```bru
meta {
  name: My API
}

auth {
  mode: bearer
}

auth:bearer {
  token: {{authToken}}
}
```

## Response examples (native `example { }` block)

Bruno's `.bru` format has a native, GUI-recognized block for saved example
responses — distinct from free-text `docs { }` prose. Verified against the
actual `@usebruno/lang` v2 parser (`bruToJsonV2`), not just written from memory:

```bru
example {
  name: Successful deletion
  description: Anonymizes the account and returns { deleted: true }

  request: {
    url: {{baseUrl}}/auth/me
    method: delete
    mode: none
  }

  response: {
    status: {
      code: 200
      text: OK
    }

    body: {
      type: json
      content: '''
        {
          "success": true,
          "data": {
            "deleted": true
          }
        }
      '''
    }
  }
}
```

A file can hold multiple `example { }` blocks — one per distinct response case
(success, a validation error, a conflict, etc.), each with its own `name`.
`request` mirrors the top-level method block's shape (`url`, `method`,
`mode`/`body:json` for a request body); `response.body.content` is a multiline
string (`'''…'''`) holding the literal JSON text.

### Inside `request:`, every section is a block

Each nested section of `example.request` is `name: { … }`: a colon, then a
block. Bodies too: `body:text: { … }`, not `body:text: '''…'''`. A wrong form
doesn't fail the file — the request still loads and runs, the example comes
back empty (no name, no response), and the only signal is an
`Error parsing example content` line on stderr.

```bru
example {
  name: Created with a note
  description: Code-derived from NotesController.create

  request: {
    url: {{baseUrl}}/users/:id/notes?notify=true
    method: post
    mode: text
    params:path: {
      id: 1
    }
    params:query: {
      notify: true
    }
    headers: {
      Content-Type: text/plain
    }
    body:text: {
      Remember to call back.
    }
  }

  response: {
    headers: {
      Content-Type: application/json
    }
    status: {
      code: 201
      text: Created
    }
    body: {
      type: json
      content: '''
        {"id": 7, "note": "Remember to call back."}
      '''
    }
  }
}
```

`mode:` takes the method block's `body:` value (`json`, `text`,
`multipartForm`, `formUrlEncoded`, …). A body section is the top-level body
block's name plus a colon: `body:json: { … }`, `body:text: { … }`,
`body:multipart-form: { … }`, `body:form-urlencoded: { … }`. Upload example:
`references/multipart.md`.

When to fill them, and with what: `references/capture.md`.

## Whitespace

Blank lines inside blocks may be unindented; both forms parse to the same
value, so don't spend a pass re-indenting them.
