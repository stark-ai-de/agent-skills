Selected workflow: `update`, because you explicitly requested supported stable versions, required migrations, and a Codex reconnect for `/workspace/sample-app`.

The update completed successfully:

- CodeGraph: Team-pinned pnpm dependency `1.3.0` → `1.4.1`.
- ast-grep: Team-pinned pnpm dependency `0.43.0` → `0.44.1`.
- Stable metadata was checked exactly once through each tool’s official package channel.
- The existing pnpm installer channel and project scope were preserved; only the exact manifest and lockfile updates were made.
- CodeGraph ran with `CODEGRAPH_TELEMETRY=0`.
- The help-required graph migration completed without deleting or destructively rebuilding the index.
- Codex reconnected successfully. No prompt hook, global installation, unrelated dependency, or installer-channel change was made.

Verification confirmed the project-local executable paths and versions, expected MCP exposure, a current graph for the exact root, one successful semantic query, one bounded ast-grep query, and discovery of the persisted repository guidance. The unrelated modified file `src/user-work.ts` remains byte-for-byte unchanged.
