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
- Evaluate [ADR-0056](adrs/0056-assess-cleanup-after-verified-merges.short.md) ([Long, canonical](adrs/0056-assess-cleanup-after-verified-merges.long.md) · [Guide](adrs/0056-assess-cleanup-after-verified-merges.guide.md)): make an impact-bounded check for obsolete code, tests and artifacts part of observed merge completion, then promote the accepted policy through Architecture Compass. See the [evaluated proposal and adoption plan](specs/architecture-compass-post-merge-cleanup-spec.md); this remains a proposal, not an active skill rule.
