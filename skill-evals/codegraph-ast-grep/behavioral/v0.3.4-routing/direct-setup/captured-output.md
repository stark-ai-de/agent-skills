Selected `setup` for `/workspace/sample-app`: project-local pnpm installation, Codex configuration, indexing, and agent guidance. Protected Git state is clean; your authorization covers these ordinary in-root actions.

The setup would:

- Resolve policy-compatible stable versions and save exact development dependency pins for `@colbymchenry/codegraph` and `@ast-grep/cli`, preserving pnpm’s trust policy.
- Verify both exact `node_modules/.bin/` executables and their installed help.
- Configure project `.codex/config.toml` to launch `/workspace/sample-app/node_modules/.bin/codegraph`, with help-confirmed MCP arguments bound to this root, the effective project state directory, and `CODEGRAPH_TELEMETRY=0`.
- Initialize or migrate the index using supported commands and persist concise `AGENTS.md` guidance: use CodeGraph for semantic symbols, callers, call paths, and impact; use ast-grep CLI for structural syntax evidence; reconcile both before broad edits.
- Reconnect Codex and verify exposed tools, graph freshness, one semantic query, and one bounded structural query.

No setup commands or writes were performed because `/workspace/sample-app` does not exist on this host. Versions, migrations, MCP connectivity, and readiness remain unverified. The next step is execution in the environment containing that project; no renewed permission is needed for the authorized scope.
