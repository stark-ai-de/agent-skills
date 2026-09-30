Selected **setup** for `/workspace/sample-app`: your request authorizes project-local pnpm installation, Codex configuration, indexing, and agent guidance. Protected Git state is clean.

The setup would proceed by:

1. Inspecting existing project dependencies, installer provenance, tool help, configuration, and guidance.
2. Reconciling exact stable pins for `@colbymchenry/codegraph` and `@ast-grep/cli`, preserving pnpm trust policy and verifying their exact project-local executables.
3. Configuring `.codex/config.toml` with the local CodeGraph executable and explicit project root, with `CODEGRAPH_TELEMETRY=0`.
4. Performing help-confirmed initialization and required non-destructive migrations within the approved root.
5. Persisting this guidance without duplication: “Use CodeGraph for semantic symbols, callers, call paths, and impact; use ast-grep CLI for structural syntax evidence; reconcile both before broad edits.”
6. Reconnecting Codex and verifying exposed tools, one semantic query, one bounded structural query, freshness, and guidance discovery. Any graph diagnostic that may migrate metadata requires exact-root approval first.

`/workspace/sample-app` is absent on this host, so no installation, configuration, indexing, migration, or guidance writes were performed. Versions and readiness remain unverified; execution requires access to that project.
