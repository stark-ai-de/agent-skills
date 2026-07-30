# cursor-memory-curator Eval Proof

This folder contains the initial promotion proof for `cursor-memory-curator`.

## Promotion Rationale

- Broad utility: applies when Cursor persistent context is stale, noisy, conflicting, ignored, sensitive, or actively degrading Cursor Agent behavior.
- Clear boundary: covers Cursor Project Rules, legacy `.cursorrules`, `AGENTS.md`, User Rules, Team Rules, and user-provided memory-bank artifacts; excludes Codex memory cleanup and ordinary docs cleanup.
- High value: protects durable agent context with review-first cleanup, explicit approval, backup, redaction, and destination classification.
- Safe defaults: bundled inventory and scan scripts are read-only, scan output is redacted by default, and backups use private user state outside Git worktrees.
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
- `cases/explicit-start-selection.md`
- `cases/implicit-selection-no-start.md`
- `cases/agent-initiated-review-boundary.md`
- `cases/direct-cleanup-boundary.md`
- `cases/backup-manifest-reconciliation.md`
- `cases/file-persistence-failure.md`
- `cases/plan-mode-lifecycle.md`

Use `rubric.md` to grade outputs. `expected/report-shape.md` describes the expected report skeleton. `runs/` stores run summaries and evidence.

Passing outputs expose all eight workflows with `plan-run-cleanup-file` first and Recommended, announce and proceed with an intent-bound route when clear, ask on ambiguity, and keep agent-initiated activation read-only unless cleanup was explicitly requested. Every route performs the same full review. Chat routes create no durable report; file routes use one redacted record. Mutating routes require exact-file backups, Plan routes use the native lifecycle when supported, and direct cleanup is restricted to high-confidence atomic edits in existing editable Cursor context.

## Maintenance Guardrails

- Do not add a recursive `auto` workflow or alter the canonical eight-route order.
- Do not claim an official local Cursor memory store unless current Cursor docs prove one.
- Do not edit User Rules or Team Rules directly from chat-only evidence.
- Prefer new eval evidence over longer runtime instructions.
