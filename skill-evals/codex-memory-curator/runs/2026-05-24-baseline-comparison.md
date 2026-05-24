# 2026-05-24 Baseline Comparison

## Scope

Lightweight comparison for `cases/baseline-comparison.md` using only synthetic fixtures.

## Method

- Baseline expectation: a generic review can spot stale-looking text but has no required approval gate, backup rule, destination taxonomy, scanner cap, or conflict-source citation.
- With-skill expectation: `codex-memory-curator` inventories memory files, uses redacted bounded scan evidence, classifies atomic claims, cites higher-precedence repo files, and avoids edits before approval.
- Evidence came from the synthetic memory fixture, synthetic repo context, and the current skill rubric. No real user memory contents were used.

## Result

- Skill-specific value: catches repo-specific command drift, generated-file scope leakage, stale branch state, and credential-shaped text while keeping cleanup review-first.
- Baseline gap: lacks a stable decision vocabulary for `KEEP`, `MOVE TO AGENTS.md`, `MOVE TO REPO DOCS`, `MOVE TO SKILL`, `MOVE TO CONFIG`, `DELETE`, and `ASK USER`.
- Maintenance note: this is a fixture-backed comparison summary, not a model-graded benchmark. Add model outputs only when a maintainer intentionally runs with-skill and without-skill eval sessions.
