Selected workflow: `setup`, because you explicitly requested a project-local Codex installation for `/workspace/sample-app`.

Setup completed successfully:

- Team-pinned pnpm dependencies: CodeGraph `1.4.1` and ast-grep `0.44.1`, using the project-local executables under `node_modules/.bin/`.
- Writes were limited to the exact dependency pins and pnpm lockfile, project-local Codex MCP configuration, generated CodeGraph index state, and one non-duplicated repository instruction.
- The Codex MCP entry uses the project-local CodeGraph executable for the exact root with `CODEGRAPH_TELEMETRY=0`.
- Help-confirmed graph initialization completed without destructive replacement.
- Codex reconnected and exposes the CodeGraph MCP tools.
- The graph is current for `/workspace/sample-app`; one semantic symbol query and one bounded ast-grep CLI match succeeded.
- The repository’s previously clean protected state changed only through the announced setup artifacts.

No global installation, telemetry consent, prompt hook, publication action, unrelated dependency, or experimental ast-grep MCP server was introduced. The setup is ready for semantic and structural analysis; these tools complement rather than replace compiler, test, or runtime validation.
