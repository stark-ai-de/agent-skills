# Codex Operations

Incubator skills for Codex-specific operating context: MCP setup, context pressure, and memory hygiene.

These candidates are not part of the public catalog until promotion moves them into `skills/`.

| Skill                                                 | Description                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`codegraph-ast-grep`](codegraph-ast-grep/SKILL.md)   | Set up and use CodeGraph plus ast-grep for Codex CLI MCP configuration, repo exploration, symbol lookup, call graphs, impact analysis, structural search, and safe refactor planning. Use when the user asks to install, configure, initialize, verify, or use CodeGraph with ast-grep in a code repository. |
| [`codex-context-guard`](codex-context-guard/SKILL.md) | Prevent Codex context-window exhaustion during long-running refactors, repo audits, migrations, debugging sessions, or tasks with large logs, many file reads, or repeated tool output. Use when Codex context is getting high, /compact may be needed, or the user asks for context-efficient workflows.    |
