# Chaining requests

When one request produces a value (a token, an ID) that later requests use,
the chain depends on run order, running producer and consumer in one
invocation, and catching unset variables.

## Run order

`bru run` orders each directory like this:

- **Subfolders first, then the directory's own requests.** A request at the
  collection root runs *after* every folder — keep producers such as login
  inside a folder.
- **Folders alphabetically**, unless their `folder.bru` has `meta { seq }`;
  then `seq` wins. Give every folder a `seq`, the login folder first:

```bru
meta {
  name: Auth
  seq: 1
}
```

- **Requests by `meta { seq }`**, not by file name.

The bundled generator writes every `folder.bru` with a `seq` in manifest order.

## Producer and consumer in one invocation

`bru.setVar` values live for one `bru run` invocation:

- `bru run . -r --env dev` — the whole collection; values carry across folders.
- `bru run auth/login.bru orders/create-order.bru --env dev` — several paths in
  one invocation carry values too; list the producer first.
- `bru run orders/create-order.bru --env dev` on its own never sees a value
  another request sets.

## Unset variables are sent as literal text

An unset or disabled (`~`) variable is not an error: the request goes out with
the literal `{{name}}` in its URL, header or body, and `bru run` prints no
warning. A `{{` in a server log or request URL means a producer didn't run.
Make consumers fail at the cause:

```bru
script:pre-request {
  if (!bru.getVar("orderId")) {
    throw new Error("orderId is not set: run orders/create-order.bru first, in the same bru run");
  }
}
```

A pre-request script that throws fails its request, which is then not sent.

## Per-run values in bodies come from variables

Write per-run values (a test user's email, an ID) as `{{vars}}` in bodies, not
literals, so a run can retarget them with `--env-var` instead of editing files:

```bru
body:json {
  {
    "email": "{{userEmail}}",
    "orderId": "{{orderId}}"
  }
}
```

```bash
bru run . -r --env dev --env-var userEmail=qa@example.com
```

## Document the chain

List each producer → consumer pair in `collection.bru`'s `docs { }`:

```bru
meta {
  name: My API
}

docs {
  ## Running requests in order
  - `auth/login.bru` sets `authToken`, used by every request with `auth: inherit`
  - `orders/create-order.bru` sets `orderId`, used by `orders/get-order.bru` and `orders/cancel-order.bru`
}
```

## Variables in scripts

- `bru.setVar(key, val)` / `bru.getVar(key)` — runtime/in-memory, scoped to a
  single run, never written to disk. **Use this for chaining secrets like auth
  tokens between requests.**
- `bru.setEnvVar(key, val)` / `bru.getEnvVar(key)` — environment variable.
  The Bruno GUI can save environment edits into the environment file — a secret
  set this way can end up committed to Git. Use `setEnvVar` only for non-secret
  config; prefer `setVar` for tokens.
- Response: `res.status`, `res.body`, `res.responseTime`.
