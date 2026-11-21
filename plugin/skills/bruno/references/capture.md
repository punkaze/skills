# Filling `example { }` blocks

Block syntax: `references/syntax.md`.

**Workflow rule:** whenever creating or editing an endpoint's `.bru` file,
always add or update its `example { }` block(s) — don't leave this for a
separate pass. A plausible, hand-written example (matching the route's actual
response shape) is fine by default. If getting a REAL captured response would
require actually calling the live endpoint (`bru run`, curl against a running
server, etc.), ask the user before doing that — don't invoke a live endpoint
unprompted just to harvest a response for documentation.

When a live check against the endpoint already happened this session (an e2e
verification pass, manual testing, etc.) or the user explicitly asks for real
captured responses, use the actual response instead of a hand-written one —
real evidence beats a guess, and it's already sitting there. If that same
verification pass cheaply exercised more than one distinct case (a boundary
flag flipping true/false, an empty vs. populated result), capture each as its
own named `example { }` block — don't invent extra live calls beyond what real
testing already produced just to fill out cases. A large real response (a long
array, a deeply nested payload) is still worth trimming to one or two
representative elements for readability — note the trim in `description`
(e.g. "trimmed to 1 of 5 records"), and never edit the values themselves.
