Setup is complete.

- **Selected workflow:** `setup`, because you explicitly requested project-local installation and configuration.
- **Root:** `/workspace/sample-app`
- **Scope:** Team-pinned pnpm dependencies and project-local Codex configuration.
- **Protected state:** The repository was clean beforehand. Only the announced setup files changed; the pre-existing baseline was otherwise preserved.

Installed and configured:

- CodeGraph `1.4.1` at `/workspace/sample-app/node_modules/.bin/codegraph`
- ast-grep `0.44.1` at `/workspace/sample-app/node_modules/.bin/ast-grep`
- Exact dependency pins and the corresponding pnpm lockfile update
- Project-local Codex MCP registration bound to the exact root, with `CODEGRAPH_TELEMETRY=0`
- Help-confirmed CodeGraph initialization for `/workspace/sample-app`
- One concise, non-duplicated repository instruction telling agents to use CodeGraph for semantic scope and ast-grep CLI for structural evidence

Verification succeeded:

- Codex exposes the connected CodeGraph MCP tools.
- The graph is current for the exact selected root.
- A focused semantic symbol query succeeded.
- A bounded ast-grep CLI query produced the expected match.
- Codex discovers the persisted repository guidance.
- No global installation, telemetry enablement, prompt hook, destructive replacement, unrelated dependency, or experimental ast-grep MCP server was introduced.

CodeGraph is now the automatic semantic surface through Codex MCP. ast-grep remains the supported project-local CLI, with repository guidance directing coding agents to use it and reconcile its structural evidence with CodeGraph before broad edits. Neither tool by itself is compiler, type, or runtime proof.
