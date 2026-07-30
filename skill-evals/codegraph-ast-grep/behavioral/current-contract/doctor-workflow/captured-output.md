The failure is in the live Codex MCP connection, not in the project-local installations.

- **Selected workflow:** `doctor`, because you requested diagnosis without repair.
- **Root:** `/workspace/sample-app`
- **Protected state:** Unrelated repository work was not changed.
- **Writes performed:** None.

Non-opening evidence shows:

- `/workspace/sample-app/node_modules/.bin/codegraph` exists at `1.4.1`.
- `/workspace/sample-app/node_modules/.bin/ast-grep` exists at `0.44.1`.
- Stored Codex configuration contains the expected project-local CodeGraph command, exact root, and `CODEGRAPH_TELEMETRY=0`.
- Codex reports the MCP server disconnected after the former global executable path was deleted.
- Repository guidance exists once and is current.

Diagnosis: the active Codex MCP connection is stale from the deleted global executable and has not successfully respawned from the correct stored project-local entry. Confidence is high for the connection-layer failure, but graph health itself remains unverified.

I did not reconnect Codex, edit configuration, sync or rebuild the graph, change packages, or perform any repair. I also skipped `codegraph status` and an MCP graph query because opening the exact-root graph can migrate generated metadata and you did not approve that boundary or a disposable copy. No remote update lookup was requested or performed.

The narrowest follow-up is an explicitly authorized Codex MCP reconnect/restart using the existing stored configuration, followed by tool enumeration. If it remains disconnected, select a focused `setup` reconciliation. A graph-status or semantic-readiness check would still need separate affirmative approval for `/workspace/sample-app` because it may migrate generated state.
