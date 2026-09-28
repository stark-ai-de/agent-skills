# Codex Operations

Promoted skills for Codex-specific operating context.

Third-party helper skills live outside the public catalog under `.agents/skills/`.

| Skill                                                       | Description                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`codex-memory-curator`](codex-memory-curator/SKILL.md)     | Audit and safely curate Codex memory, including stale claims, cross-repo leakage, sensitive entries, and memory configuration. Use when reviewing or cleaning Codex memory, not generic repository docs.                                                                                           |
| [`codex-spec-interviewer`](codex-spec-interviewer/SKILL.md) | Turn ambiguous coding requests into verified Codex implementation specs. Use when the user wants requirements, an implementation plan, or a spec before coding; include source checks, needed ADRs, and agreed delivery. Do not use for already specified direct implementation or memory cleanup. |
