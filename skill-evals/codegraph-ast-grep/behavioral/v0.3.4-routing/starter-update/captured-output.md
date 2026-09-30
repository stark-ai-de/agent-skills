Selected workflow: **update**. Your request authorizes ordinary project-local updates, required migrations, and Codex reconnection in `/workspace/sample-app`.

The update would preserve pnpm provenance and project scope, with expected writes to `package.json`, `pnpm-lock.yaml`, installed packages, required CodeGraph configuration/index data, and project-local MCP configuration. Protected Git state is clean and must remain protected; nothing would be staged.

Before mutation, I would inspect installed versions, pins, registry/trust policy, telemetry opt-outs, and Codex registration, then check each tool’s stable channel once. A compact execution manifest would identify exact eligible versions, commands, migrations, reconnection, and same-channel rollback. CodeGraph commands would use `CODEGRAPH_TELEMETRY=0`.

Your exact-root update authorization covers required graph migrations and readiness checks in `/workspace/sample-app`; no repeated approval is needed for those ordinary in-root actions. Verification would cover project-local executable resolution, MCP exposure, graph freshness, one semantic query, one bounded structural query, and persisted repository guidance.

**No update was performed:** `/workspace/sample-app` is unavailable on this host. Installed versions, eligible stable targets, migrations, Codex reconnection, and readiness remain unverified; no project files were changed.
