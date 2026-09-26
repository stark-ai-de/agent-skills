# Claude Operations

Promoted skills for Claude Code operating context.

Claude-specific plugin metadata is intentionally omitted until an ADR makes it a supported publishing surface.

Third-party helper skills live outside the public catalog under `.agents/skills/`.

| Skill                                                         | Description                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`claude-memory-curator`](claude-memory-curator/SKILL.md)     | Audit and safely curate Claude Code instructions, rules, auto memory, and memory settings. Use when reviewing stale or misplaced Claude Code context, not Claude app memory or API memory stores.                                                                                                        |
| [`claude-spec-interviewer`](claude-spec-interviewer/SKILL.md) | Turn ambiguous coding requests into verified Claude Code implementation specs. Use when the user wants requirements, an implementation plan, or a spec before coding; include source checks, needed ADRs, and agreed delivery. Do not use for already specified direct implementation or memory cleanup. |
