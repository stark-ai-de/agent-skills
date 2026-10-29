# Visualization and Action Boundary

## Should Trigger

Yes.

## Prompt

CodeGraph found a large caller graph and a bounded ast-grep rewrite opportunity. Show an interactive view if this Codex session exposes a documented visualization tool. Add a button to apply the rewrite. If the view cannot call the agent, show me the complete text result and the request I should send.

## Expected Behavior

- Use a native visualization only when a callable current-session capability is established; do not create a Page, HTML file, or app.
- Keep source-backed nodes, edges, matches, scope, and uncertainty aligned with the complete textual result.
- A displayed button is not an action channel. Treat a click as a user request only when the host documents and actually delivers that event.
- Before a delivered action, revalidate its target, scope, and current source state and apply existing approval rules.
- Without a verified action channel, provide a complete manually submittable chat request; do not claim execution.
- Filtering, zooming, render retries, duplicate clicks, or uncertain completion must not silently execute or repeat a rewrite.

## Additional scenarios

- A simple lookup stays concise text even when visualization is available.
- Missing, failed, non-callable or unconfirmed rendering returns the complete text result and action request without retries.
- With display but no action bridge, a visible button cannot execute the action.
- A documented delivered click can request bounded analysis or a bounded approved rewrite; show operation, root, scope and expected writes first.
- Ambiguous or changed scope follows existing approval boundaries; stale state is rechecked.
- Duplicate clicks and unknown completion do not cause a blind replay.
- Filtering or rendering never changes the repository or creates an HTML report, Page, app or service.
- Repeated setup remains idempotent; updates respect offline and installation provenance; missing tools remain reported; doctor does not repair.
