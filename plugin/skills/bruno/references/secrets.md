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

## Secrets on the command line

Prefer `--env-file` or `--env-var KEY=$SHELL_VAR`; never paste a live
secret literal on the command line (it leaks into shell history).
