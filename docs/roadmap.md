# Roadmap

## Current Foundation

- Provide a public, installable Agent Skills repository.
- Include promoted Codex, Cursor, and Claude operations, skill maintenance, and engineering workflow skills, with other candidates incubating separately.
- Follow the open Agent Skills specification.
- Run skill and ADR checks through the [repository validation commands](../package.json) with lockfile-managed dependencies.
- Prefer read-only helper scripts.
- Document long-lived repo decisions as linked [Short, Long, and Guide ADRs](adrs/README.md), with Long as canonical.
- Keep `skills/` promoted-only and track candidates under `incubator/skills/`.
- Keep skill evaluation proof under `skill-evals/` instead of the runtime payload by default.

## Implemented

- Generated skill catalog in [`site/`](../site/), built by the [GitHub Pages workflow](../.github/workflows/pages.yml).
- Regression tests for validator contracts under [`scripts/validation/`](../scripts/validation/), including [bundle validation fixtures](../scripts/validation/test-bundle-contract.mjs).
- [Clean-copy install smoke tests](../scripts/repo/smoke-install.mjs) in the [Validate workflow](../.github/workflows/validate.yml).
- Realistic [prompt cases](../skill-evals/codex-spec-interviewer/cases/webhook-idempotency.md) and [expected behavior](../skill-evals/codex-spec-interviewer/expected/standard-spec-sections.md) under [`skill-evals/`](../skill-evals/README.md).
- Validation, GitHub Pages, release, and license badges in the [repository README](../README.md).

## Future Work

- Evaluate future public-skill candidates tracked in [Skill Ideas](skill-ideas.md).
- Add GitHub issue and pull request templates.
- Evaluate Claude plugin metadata only after an ADR makes it a supported publishing surface.
- Evaluate a candidate ADR for provenance-aware assistant statements across Architecture Compass and `codex-memory-curator`: visibly label current verification, memory-derived claims that may be stale, user-provided facts, and assumptions, with timestamps or sources when freshness matters.
- Qualify an explicitly enabled Codex `UserPromptSubmit` adapter that can call Jev before normal skill selection, removing Jev's own bootstrap requirement. Revalidate access to the current eligible skill/MCP inventory; fall back to native selection whenever inventory, permissions, hook trust, or Jev availability cannot be confirmed. Measure hook overhead and task outcomes before claiming automatic routing, and qualify Claude and plugin hosts separately. See [ADR-0057](adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.short.md) ([Long, canonical](adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) · [Guide](adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.guide.md)), the [Jev integration contract](../skills/skill-maintenance/jev-capability-advisor/references/session-integration.md), [Codex hooks](https://learn.chatgpt.com/docs/hooks), and the [Codex app-server](https://learn.chatgpt.com/docs/app-server).
- Evaluate [ADR-0061](adrs/0061-assess-cleanup-after-verified-merges.short.md) ([Long, canonical](adrs/0061-assess-cleanup-after-verified-merges.long.md) · [Guide](adrs/0061-assess-cleanup-after-verified-merges.guide.md)): make an impact-bounded check for obsolete code, tests and artifacts part of observed merge completion, then promote the accepted policy through Architecture Compass. See the [evaluated proposal and adoption plan](specs/architecture-compass-post-merge-cleanup-spec.md); this remains a proposal, not an active skill rule.
- Evaluate an Architecture Compass ADR for explanatory GitHub PR comments in **Files changed**: add at least one concise change-and-reason review comment per changed file, including documentation and deleted files; use a meaningful diff line or the first available diff line for file-wide explanations, and the original (LEFT) side for deletions. Top-level PR comments do not satisfy this coverage. Recheck the current PR head, avoid duplicate comments, and verify published per-file coverage.
