I can’t execute that rewrite yet. For `/workspace/rewrite-app`, ast-grep `0.44.1` is ready, but the required safety boundary is unmet:

- No replacement for `fetch(...)` was specified.
- No syntax-variant inventory or positive/negative tests exist.
- No exact path allowlist, preview count, or reviewed scope exists.
- No source, rule, fixture, or configuration writes are approved.
- Unrelated user changes must be preserved.

A repository-wide rewrite requires a match-only preview, frozen replacement and scope, explicit approval, then diff review and project validation. I made no changes.
