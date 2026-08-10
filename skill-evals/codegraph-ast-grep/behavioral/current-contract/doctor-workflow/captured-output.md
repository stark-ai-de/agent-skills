Selected workflow: `doctor`, because you requested diagnosis without repair for `/workspace/sample-app`.

Observed non-opening evidence:

- Project-local CodeGraph exists at `/workspace/sample-app/node_modules/.bin/codegraph` and reports `1.4.1`.
- Project-local ast-grep exists at `/workspace/sample-app/node_modules/.bin/ast-grep` and reports `0.44.1`.
- Codex stores the expected project-local CodeGraph command, exact project root, and `CODEGRAPH_TELEMETRY=0`.
- Codex’s MCP inventory nevertheless reports CodeGraph disconnected after the former global executable path was deleted.
- Repository guidance exists once and is current.

Diagnosis: the verified failure is at the Codex MCP connection layer, not evidence that either project-local executable is missing. The likely cause is a stale server/session connection left from the deleted global executable; the stored project-local configuration has not become active in the disconnected session.

I performed no reconnect, configuration edit, package action, graph sync/rebuild, or other repair. I also skipped `codegraph status` and MCP graph queries because opening this exact root could migrate generated metadata and you did not approve that boundary. Consequently, graph freshness, indexed-language coverage, and semantic query readiness remain unverified. No remote update lookup was performed, and all unrelated Git state remains untouched.

Recommended follow-up, if you later authorize repair: run a narrowly scoped `setup` reconciliation that restarts or reconnects Codex using the existing project-local entry. Deep graph health can then be checked only after separate affirmative approval for project-opening diagnostics on `/workspace/sample-app` or an approved disposable copy.
