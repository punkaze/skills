# `.bru` syntax

The core rules (the `url:` line is what gets sent, `params:query`,
`params:path`, `auth: inherit`) are in SKILL.md. This file has the full shapes.

## A request file

```bru
meta {
  name: Get User
  type: http
  seq: 1
  tags: [smoke]
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

When to fill them, and with what: `references/capture.md`.
