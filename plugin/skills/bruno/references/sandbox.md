# Script sandbox

**Sandbox (v3 default changed):** the CLI defaults to **`--sandbox safe`** — no
filesystem access, no `require()` of external npm packages. Only pass
`--sandbox developer` when you trust the collection and genuinely need fs/exec/
npm in scripts; it is dangerous with untrusted collections.
