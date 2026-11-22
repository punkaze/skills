---
name: bruno
description: "Bruno, the Git-friendly API client, and its CLI (bru). Use when authoring or editing .bru requests/collections, generating a collection from an OpenAPI spec or a codebase's routes, writing Bruno tests or scripts, managing environments and secrets, or running collections with `bru run` (local or CI)."
metadata:
  author: piyawat
  version: "1.3.0"
  tags: ["api-client", "bruno", "bru", "http", "testing", "ci"]
---

# Bruno — Author, Generate, and Run .bru Collections

Requires the Bruno CLI: `npm install -g @usebruno/cli`, or the project's own
devDependency via `npx --no-install bru …` when it pins one. Verified against
**bru 3.5.3** (`bru --version`). The generator needs Node.js 18+. Paths to
`scripts/` and `references/` are relative to this skill's base directory.

## Generating a collection — two paths

**Path A — an OpenAPI/Swagger spec exists (preferred).** Look for
`openapi.yaml`, `swagger.json`, or a framework's swagger endpoint first, then:

```bash
bru import openapi -s <spec.yaml|url> -o <out-dir> -n "My API" --collection-format bru -g path
```

`--collection-format bru` is required — the CLI default (`opencollection`)
emits `.yml` files, not a `.bru` collection. `-g path` groups folders by URL;
`tags` (the default) groups by OpenAPI tags.

**Then fix query params — the import drops them.** `bru import` writes query
params only into `params:query` and leaves them off the `url:` line, so
`bru run` never sends them (see Core rules). For every imported request with a
`params:query` block, append its enabled entries to `url:` (`?k=v&…`). This
lists the files still missing them:

```bash
grep -rL --null --include='*.bru' -E '^\s+url: .*\?' <out-dir> | xargs -0 grep -l '^params:query {'
```

**Done when** `<out-dir>` contains `bruno.json` and `.bru` files (an
`opencollection.yml` there means the format flag was dropped) and the check
above prints nothing.

**Path B — no spec.** Read the codebase and write a **routes manifest**
(schema `references/routes.schema.json`, example
`references/sample-manifest.json`), then run the bundled generator:

```bash
node "<skill-dir>/scripts/generate-bruno.js" --manifest routes.json --out ./api-collection
```

`--force` overwrites existing files; `--dry-run` writes nothing. Extract
routes by reading the code — do **not** write a per-framework regex route
scanner. **Done when** the generator reports `wrote N file(s)` and, with the
API running, `bru run . -r --env <env>` from the output dir executes every
request. Manifest notes:
- Manifest `auth.type` becomes collection auth in `collection.bru`. Route
  `auth`: `true` → `inherit`, `false` → `none`, or an explicit
  `"bearer"|"basic"|"inherit"|"none"`.
- `:param` in `path` for path params; route `query` goes on the `url:` line,
  mirrored in `params:query`.
- `script: "token-capture"` stores `res.body.token` in the runtime variable
  `authToken`; `tests` takes `status-200`, `status-201`, `status-2xx`.
- Each folder gets `meta { seq }` in the order its first route appears, so
  list the login route first.

## Core rules

- **Every endpoint change updates its `.bru` file in the same commit** — the
  request, its `tests` and its `example { }` blocks, whether the endpoint was
  added, changed or removed.
- **The `url:` line is what gets sent.** `bru run` sends the URL exactly as
  written; `params:query` is only a mirror that the GUI keeps in sync (GUI,
  not verified), and a
  param that exists only there is silently dropped. Put every enabled query
  param on the URL (`?k=v&…`) and keep `params:query` matching it.
- Query params use **`params:query { }`**, NOT legacy `query { }`. Path params
  keep **`:param` in the URL** plus a **`params:path { }`** block, NOT `{{param}}`.
- Requests use **`auth: inherit`** to reuse collection/folder auth; emit
  `auth:bearer` / `auth:basic` blocks only for a per-request override.
- **Green means nothing was skipped.** `bru run` skips a file it can't parse,
  warns on stderr, and still reports `✓ PASS` with exit 0, even with `--bail`.
  Pass = no `Skipped` in the summary and the grep below prints `0`.

## Running with `bru run`

Run from the **collection root** (the directory containing `bruno.json`) —
anywhere else fails with "You can run only at the root of a collection".

```bash
bru run . -r --env dev                            # run the whole collection recursively
bru run folder -r --env dev                       # run a folder recursively
bru run request.bru --env-file env.bru            # explicit env file
bru run . -r --env dev --env-var token=$TOK       # override one var from shell (no secret in history)
bru run . -r --reporter-junit results.xml --reporter-html report.html
bru run . -r --bail --tests-only                  # CI: stop on first failure, only requests with tests
bru run . -r --csv-file-path data.csv --parallel  # data-driven, parallel iterations
bru run . -r --tags smoke --exclude-tags wip      # meta tags, multi-line form only (syntax.md)
bru run . -r --env dev 2>&1 | tee /tmp/bru-run.log
grep -cE 'Skipping invalid file|Error parsing example content' /tmp/bru-run.log  # must print 0
```

`--env` takes the environment's file name without `.bru`; quote names with
spaces: `--env "dev (local)"`.

## Reference files — read the one you need

- `references/syntax.md` — any `.bru` edit: full syntax, `collection.bru`, `example { }`.
- `references/chaining.md` — requests that feed each other: order, `bru.setVar`, unset vars.
- `references/secrets.md` — environments, `vars:secret`, `.env`, gitignore, leaks.
- `references/sandbox.md` — `require()` in scripts, HMAC signing, `--sandbox developer`.
- `references/multipart.md` — file uploads and form bodies.
- `references/capture.md` — filling `example { }`: captured vs. code-derived, preflight.
- `references/websocket.md` — `type: ws` requests, Socket.IO servers.
- `references/adopting.md` — taking over an existing collection.
