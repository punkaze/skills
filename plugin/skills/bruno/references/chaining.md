# Chaining requests

## Variables in scripts

- `bru.setVar(key, val)` / `bru.getVar(key)` — runtime/in-memory, scoped to a
  single run, never written to disk. **Use this for chaining secrets like auth
  tokens between requests.**
- `bru.setEnvVar(key, val)` / `bru.getEnvVar(key)` — environment variable.
  The Bruno GUI can save environment edits into the environment file — a secret
  set this way can end up committed to Git. Use `setEnvVar` only for non-secret
  config; prefer `setVar` for tokens.
- Response: `res.status`, `res.body`, `res.responseTime`.
