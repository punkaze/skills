# Script sandbox

`bru run` runs scripts in `--sandbox safe` by default: an isolated JavaScript
engine with a fixed set of modules. `--sandbox developer` runs scripts with
Node's built-in modules (such as `fs` and `crypto`) — use it only for a
collection you trust, and only when the safe sandbox can't do the job.

## `require()` in the safe sandbox

| Loads | Fails with `Cannot find module …` |
|---|---|
| `crypto-js`, `axios`, `uuid`, `nanoid`, `moment`, `jsonwebtoken`, `ajv`, `chai`, `buffer`, `path` | `crypto`, `node:crypto`, `fs`, `lodash`, `child_process` |
| a relative path to a `.js` file in the collection, e.g. `require("./lib/sign.js")` | |

A failing `require()` fails its request, which is then not sent. For hashing
and HMAC use `crypto-js`: its `HmacSHA256` matches Node's
`crypto.createHmac("sha256", …)`.

`--sandbox developer` is justified when a script needs a Node built-in with no
safe equivalent (`fs` to read a file at run time) or an npm package outside the
table. It is not needed for hashing or signing.

## Sign the exact bytes you send (HMAC)

`req.getBody()` with no options parses the body as JSON whenever the
request's `Content-Type` header contains `json` — and that check runs on the
header alone, not on the body mode. An explicit `Content-Type:
application/json` turns this on even for `body:text`, so plain
`req.getBody()` hands back a parsed object instead of the bytes that go over
the wire, and `CryptoJS.HmacSHA256()` of that object won't match the
signature the receiver computes from the raw request. Pass `{ raw: true }` to
always get the literal string:

```bru
meta {
  name: Signed Event
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/hooks/ingest
  body: text
  auth: none
}

headers {
  Content-Type: application/json
}

body:text {
  {"event":"ping","id":1}
}

script:pre-request {
  const CryptoJS = require("crypto-js");
  const raw = req.getBody({ raw: true });
  req.setHeader("X-Signature", CryptoJS.HmacSHA256(raw, bru.getEnvVar("signingKey")).toString());
}
```

With `body:json`, `req.getBody()` returns a parsed object, and re-serializing
it may not reproduce the bytes sent. Don't sign a hand-copied string literal
of the body either: it goes stale the first time someone edits the body.
