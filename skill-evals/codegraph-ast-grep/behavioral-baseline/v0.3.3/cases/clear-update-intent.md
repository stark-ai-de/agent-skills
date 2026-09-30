# Clear Update Intent

## Should Trigger

Yes.

## Prompt

Update this repository's CodeGraph and ast-grep setup to supported stable versions, run every required migration, and make sure Codex reconnects successfully.

## Expected Behavior

- Expose all three workflows, select and announce `update`, and proceed without a redundant workflow confirmation.
- Preserve each tool's installer channel and global/project/declarative scope while checking authoritative stable targets once.
- Itemize tool versions, commands, writes, migrations, reconnect, verification, and rollback in an execution manifest.
- Run required configuration/index/schema migrations and verify version/PATH, MCP exposure, graph readiness, semantic/structural queries, and persisted guidance.
- Stop for any privilege, channel/scope, destructive rebuild, telemetry, unrelated dependency, or external-service expansion.
