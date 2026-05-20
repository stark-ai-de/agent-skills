# Codex Operations

Skills for Codex-specific operating context: MCP setup, context pressure, and memory hygiene.

Third-party helper skills live outside the public catalog under `.agents/skills/`.

| Skill                                                   | Description                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`codegraph-ast-grep`](codegraph-ast-grep/SKILL.md)     | Set up and use CodeGraph plus ast-grep for Codex CLI MCP configuration, repo exploration, symbol lookup, call graphs, impact analysis, structural search, and safe refactor planning. Use when the user asks to install, configure, initialize, verify, or use CodeGraph with ast-grep in a code repository.                              |
| [`codex-context-guard`](codex-context-guard/SKILL.md)   | Prevent Codex context-window exhaustion during long-running refactors, repo audits, migrations, debugging sessions, or tasks with large logs, many file reads, or repeated tool output. Use when Codex context is getting high, /compact may be needed, or the user asks for context-efficient workflows.                                 |
| [`codex-memory-curator`](codex-memory-curator/SKILL.md) | Review, grill, clean up memories, rewrite, and prune Codex memories. Use when the user asks to review memories, audit ~/.codex/memories, remove stale memories, reduce memory pollution, decide if memories made Codex worse, move memory to AGENTS.md, disable or tune memories, or choose AGENTS.md, config, docs, skills, or deletion. |
