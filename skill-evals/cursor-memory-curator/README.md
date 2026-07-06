# cursor-memory-curator Eval Proof

This folder contains the initial promotion proof for `cursor-memory-curator`.

## Promotion Rationale

- Broad utility: applies when Cursor persistent context is stale, noisy, conflicting, ignored, sensitive, or actively degrading Cursor Agent behavior.
- Clear boundary: covers Cursor Project Rules, legacy `.cursorrules`, `AGENTS.md`, User Rules, Team Rules, and user-provided memory-bank artifacts; excludes Codex memory cleanup and ordinary docs cleanup.
- High value: protects durable agent context with review-first cleanup, explicit approval, backup, redaction, and destination classification.
- Safe defaults: bundled inventory and scan scripts are read-only, scan output is redacted by default, and backup only creates a copy.
- Manageable maintenance: the skill depends on Node.js stdlib helpers, public Cursor rule semantics, and synthetic eval cases instead of private Cursor state.

## Eval Set

Cases cover positive triggers, negative triggers, and output-quality expectations:

- `cases/review-stale-project-rule.md`
- `cases/legacy-cursorrules-migration.md`
- `cases/plain-md-rule-ignored.md`
- `cases/user-rules-manual-action.md`
- `cases/team-rule-conflict-readonly.md`
- `cases/memory-bank-optional-artifact.md`
- `cases/sensitive-rule-redaction.md`
- `cases/codex-memory-negative.md`
- `cases/generic-docs-cleanup-negative.md`
- `cases/approval-denied-no-edit.md`

Use `rubric.md` to grade outputs. `expected/report-shape.md` describes the expected report skeleton. `runs/` stores run summaries and evidence.

Passing outputs must produce a cleanup report before edits, classify every atomic claim with exactly one primary classification, redact sensitive values, cite higher-precedence conflict sources, distinguish manual User/Team Rule actions from editable repo files, add a structured cleanup plan when approval needs ID-level precision, and require explicit approval plus backup before cleanup.

## Maintenance Guardrails

- Do not add auto-apply cleanup scripts or interactive cleanup menus.
- Do not claim an official local Cursor memory store unless current Cursor docs prove one.
- Do not edit User Rules or Team Rules directly from chat-only evidence.
- Prefer new eval evidence over longer runtime instructions.
