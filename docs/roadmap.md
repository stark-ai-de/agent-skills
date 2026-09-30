# Roadmap

## V1

- Provide a public, installable Agent Skills repository.
- Include promoted repo maintenance, Codex operations, skill maintenance, and productivity skills, with engineering workflow candidates incubating separately.
- Follow the open Agent Skills specification.
- Keep skill and ADR validation dependency-free.
- Prefer read-only helper scripts.
- Document long-lived repo decisions as short ADRs.
- Keep `skills/` promoted-only and track candidates under `incubator/skills/`.
- Keep skill evaluation proof under `skill-evals/` instead of the runtime payload by default.

## Future Work

- Add a generated skill catalog if it proves useful.
- Track future public-skill candidates in [Skill Ideas](skill-ideas.md).
- Add tests for validation scripts.
- Run clean-copy install smoke tests in CI.
- Add the first realistic prompt and expected-behavior cases under `skill-evals/`.
- Add GitHub issue and pull request templates.
- Add badges after CI is active on the public repository.
- Evaluate Claude plugin metadata only after an ADR makes it a supported publishing surface.
- Evaluate a candidate ADR for provenance-aware assistant statements across Architecture Compass and `codex-memory-curator`: visibly label current verification, memory-derived claims that may be stale, user-provided facts, and assumptions, with timestamps or sources when freshness matters.
- Qualify an explicitly enabled Codex `UserPromptSubmit` adapter that can call Jev before normal skill selection, removing Jev's own bootstrap requirement. Revalidate access to the current eligible skill/MCP inventory; fall back to native selection whenever inventory, permissions, hook trust, or Jev availability cannot be confirmed. Measure hook overhead and task outcomes before claiming automatic routing, and qualify Claude and plugin hosts separately. See [ADR-0057](adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.short.md) ([Long, canonical](adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) · [Guide](adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.guide.md)), the [Jev integration contract](../skills/skill-maintenance/jev-capability-advisor/references/session-integration.md), [Codex hooks](https://learn.chatgpt.com/docs/hooks), and the [Codex app-server](https://learn.chatgpt.com/docs/app-server).
- Evaluate an Architecture Compass ADR for explanatory GitHub PR comments in **Files changed**: add at least one concise change-and-reason review comment per changed file, including documentation and deleted files; use a meaningful diff line or the first available diff line for file-wide explanations, and the original (LEFT) side for deletions. Top-level PR comments do not satisfy this coverage. Recheck the current PR head, avoid duplicate comments, and verify published per-file coverage.
