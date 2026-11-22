# Environments and secrets

## Environment files

```bru
vars {
  baseUrl: http://localhost:3000
}
vars:secret [
  authToken
]
```

Secret variable **names** go in `vars:secret [ ]`; their **values are never
written to disk** — set them at runtime or via the GUI. Bruno also supports typed
vars (`@number`, `@boolean`, `@object`) and multiline values with `'''…'''`.

## Where credentials live

A credential-shaped value — anything under a name like `*key*`, `*token*`,
`*secret*`, `*password*`, or an `Authorization` header value — never sits as a
literal in a plain `vars { }` entry or a `.bru` file, enabled or disabled
(`~name:` is still committed). It goes in one of two places:

- a **`vars:secret [ ]`** name, whose value never touches the file, or
- a gitignored **`.env`** file at the collection root.

## Loading secrets for CLI runs

Reference the secret from the environment file and keep the value in the
collection's gitignored `.env`. `bru run` reads that file itself; in CI, a real
environment variable with the same name works the same way:

```bru
vars {
  baseUrl: http://localhost:3000
  apiKey: {{process.env.API_KEY}}
}
vars:secret [
  signingKey
]
```

```bash
# <collection-root>/.env — gitignored, never committed
API_KEY=replace-me
```

Requests keep using `{{apiKey}}`. Never type a secret literal on the command
line (`--env-var apiKey=…` lands in shell history); pass a `vars:secret` value
only from a variable that is already set: `--env-var signingKey="$SIGNING_KEY"`.

### When the values already live in the app's env file

`{{process.env.NAME}}` also reads variables exported in the shell. If the
project keeps its secrets in its own env file outside the collection (for
example the app's `.env.local` one folder up), load that file for the run
instead of copying the values into a second `.env`:

```bash
(set -a; . ../.env.local; set +a; bru run . -r --env dev)
```

The subshell keeps the values out of your interactive shell. `.` sources the
file as shell, not as plain key-value pairs: only do this for a trusted,
plain `KEY=value` file, quote any value with a space or `$`, and know that a
value containing `$(…)` or backticks executes.

## What the CLI masks in reports

`--reporter-json` reports mask the `Authorization` and `X-Api-Key` headers
(`Bearer ********`) and the values of `.env` entries and of `vars:secret` names
passed with `--env-var`. They do not mask tokens inside response bodies, such
as a login response: add `--reporter-skip-response-body` before sharing a
report from a run that logs in.

## Commit templates, gitignore the real files

Commit `environments/<name>.template.bru` with empty values; gitignore the real
environment files and `.env`. Use `**/` patterns: a pattern containing a slash,
such as `api/environments/*.bru`, only matches relative to the `.gitignore`'s
own directory and silently misses a collection nested anywhere else.

```gitignore
**/environments/*.bru
!**/environments/*.template.bru
.env
```

Check with `--no-index`, which also covers files that are already tracked
(plain `git check-ignore` skips those):

```bash
git check-ignore -v --no-index path/to/collection/environments/dev.bru           # prints the ignoring rule
git check-ignore -v --no-index path/to/collection/environments/dev.template.bru  # prints the ! rule
```

A real env file that is already tracked stays tracked until
`git rm --cached <file>` (your local copy is kept).

## Inspect env files by name only

Never `cat` an environment file or `.env`: the values land in the transcript or
log. List the names:

```bash
sed -nE 's/^[[:space:]]+(~?[A-Za-z0-9_.-]+):.*/\1/p' environments/dev.bru
sed -nE 's/^([A-Za-z0-9_]+)=.*/\1/p' .env
```

## After a leak

A credential that was ever committed (even disabled with `~`, even since
blanked) or printed into a transcript, log or CI output is leaked: rotate or
revoke it. Blanking the line doesn't remove it from git history.
