The root is `/workspace/sample-app`, but no workflow is selected. This skill has exactly three public workflows and no `auto` mode:

1. **`setup`** — Install or reconcile the complete project-local stack, configure Codex MCP, initialize the graph, and persist agent guidance. Expected writes may include the project manifest/lockfile, project Codex configuration, generated graph state, and one repository-guidance entry.

2. **`update`** — Preserve the existing installer channel and scope, update stable CodeGraph and ast-grep components, run required in-root migrations, and reconnect Codex. Expected writes may include exact dependency/lockfile updates and required generated-state or runtime-config migrations.

3. **`doctor`** — Diagnose executable, configuration, MCP, graph, and guidance health without repairing anything. Non-opening checks remain non-mutating; `codegraph status` or an MCP graph query may migrate generated metadata and would require separate affirmative approval for this exact root or an approved disposable copy.

I have not inspected repository or tool state, checked remote versions, opened the graph, or changed anything. Protected state is therefore not yet known. Privileged or global writes, telemetry changes, destructive replacement, external services, and scope expansion remain separate approval boundaries.

Which workflow should I use: `setup`, `update`, or `doctor`?
