# Filling `example { }` blocks

Block syntax: `references/syntax.md`.

**Workflow rule:** whenever creating or editing an endpoint's `.bru` file,
always add or update its `example { }` block(s) — don't leave this for a
separate pass. An example is one of two kinds: **captured** (a real response
from a live call) or **code-derived** (its shape and values read off the
handler or serializer, labelled as below). A code-derived example is fine by
default. **Never invent a response:** if neither a capture nor the code gives
you the shape, ask the user. If getting a REAL captured response would
require actually calling the live endpoint (`bru run`, curl against a running
server, etc.), ask the user before doing that — don't invoke a live endpoint
unprompted just to harvest a response for documentation.

When a live check against the endpoint already happened this session (an e2e
verification pass, manual testing, etc.) or the user explicitly asks for real
captured responses, use the actual response instead of a code-derived one —
real evidence beats a guess, and it's already sitting there. If that same
verification pass cheaply exercised more than one distinct case (a boundary
flag flipping true/false, an empty vs. populated result), capture each as its
own named `example { }` block — don't invent extra live calls beyond what real
testing already produced just to fill out cases. A large real response (a long
array, a deeply nested payload) is still worth trimming to one or two
representative elements for readability — note the trim in `description`
(e.g. "trimmed to 1 of 5 records"), and never edit the values themselves.

## Label code-derived examples

When an example comes from reading the code rather than a live call:

- start its `description` with `Code-derived` and name the source, e.g.
  `description: Code-derived from OrdersController.create`;
- add `(inferred)` when a field's value or shape can't be read off the code
  with confidence;
- list the examples that *are* real captures in `collection.bru`'s `docs { }`,
  so a reader knows everything else is code-derived:

```bru
meta {
  name: My API
}

docs {
  ## Examples
  Captured from a live run: `auth/login.bru` (Success), `orders/create-order.bru` (Created).
  Every other `example { }` is code-derived and says so in its `description`.
}
```

## Preflight before any capture

Before building anything to capture live responses (a runner script, a list of
requests to call, a scrubber for the output), prove the stack serves an
authenticated request end to end, in one `bru run`: login, one authenticated
`GET`, one harmless write.

```bash
bru run auth/login.bru users/list-users.bru notes/create-note.bru --env dev
```

If any of the three fails for a reason outside the collection — an upstream
service, VPN, DNS, a missing client certificate — stop and ask the user whether
to fix the environment or fill the examples from code instead.

## Destructive requests

Tag requests that delete data or change it irreversibly, using the multi-line
form (a one-line `tags: [destructive]` is ignored by `--exclude-tags`):

```bru
meta {
  name: Cancel Order
  type: http
  seq: 4
  tags: [
    destructive
  ]
}

post {
  url: {{baseUrl}}/orders/:id/cancel
  body: none
  auth: inherit
}

params:path {
  id: {{orderId}}
}
```

- Run captures with `--exclude-tags destructive`: excluded requests are not
  sent and don't appear in the run summary.
- Pair each destructive request with one that restores the state (re-create
  the record, change the setting back) and run them together, only when the
  user asks.
