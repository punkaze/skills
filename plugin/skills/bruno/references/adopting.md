# Adopting an existing collection

Run this checklist from the collection root before adding to a collection
someone else built, and fix what each step finds first. The grep checks in
steps 2–7 print file names only, never values.

## 1. Nothing is skipped, every example parses

Check the env's `baseUrl` points at a local or dev server first. Run step 4
first and convert any one-line tags — `--exclude-tags` ignores those.
Untagged DELETE/POST requests still run regardless, so look for them before
running against anything but a throwaway local server. Then exclude
destructive requests (`references/capture.md`):

```bash
bru run . -r --env <env> --exclude-tags destructive 2>&1 | tee /tmp/bru-run.log
grep -nE 'Skipping invalid file|Error parsing example content' /tmp/bru-run.log
```

## 2. Query params are on the `url:` line

```bash
grep -rL --null --include='*.bru' -E '^\s+url: .*\?' . | xargs -0 grep -l '^params:query {'
```

## 3. No empty `@file()`

```bash
grep -rln --include='*.bru' '@file()' .
```

Commit a small fixture and point at it (`references/multipart.md`).

## 4. Tags use the multi-line form

```bash
grep -rln --include='*.bru' -E '^  tags: \[.+\]' .
```

## 5. No committed credentials

```bash
grep -rlE 'eyJ[A-Za-z0-9_-]+\.eyJ' .
grep -rniE --include='*.bru' '^[[:space:]]*~?[A-Za-z0-9_.-]*(key|token|secret|password|authorization)[A-Za-z0-9_.-]*:[[:space:]]*[^[:space:]]' . | grep -v '{{' | cut -d: -f1 | sort -u
git check-ignore -v --no-index environments/*.bru
```

The first lists files with JWT-shaped strings, the second files with a
credential-shaped name holding a literal value, the third which env files are
gitignored. Move what you find per `references/secrets.md`, and rotate it.

## 6. One auth layer

```bash
grep -rlE --include='*.bru' '^auth:(bearer|basic) \{' . | grep -v 'collection.bru$'
grep -rliE --include='*.bru' '^[[:space:]]+authorization:' .
```

Collections pick up several layers: per-request `auth:bearer` blocks,
`Authorization` headers on requests or in `collection.bru`. Flatten them to
collection `auth` in `collection.bru` plus `auth: inherit` on requests; keep a
per-request block only where a request truly needs different auth.

## 7. Every folder has a `seq`

```bash
find . -type d ! -name . ! -path './environments*' ! -path '*/node_modules*' ! -path '*/.git*' -exec sh -c 'grep -qs "^  seq:" "$1/folder.bru" || echo "$1"' _ {} \;
```

Ignore folders that hold no requests (such as `fixtures`). Order the rest with
`folder.bru` `meta { seq }`, login first, and write the producer → consumer
map into `collection.bru` `docs { }` (`references/chaining.md`).
