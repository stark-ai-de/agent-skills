# claude-memory-curator Eval Proof

This folder contains the initial promotion proof for `claude-memory-curator`.

## Promotion Rationale

- Broad utility: applies when Claude Code durable context is stale, noisy, conflicting, unenforced, sensitive, or actively degrading future sessions.
- Clear boundary: covers `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules`, user-level Claude rules, settings, hooks, managed policy evidence, and auto memory; excludes Codex memory, Cursor rules, Claude app account memory, and Anthropic API Memory Stores.
- High value: protects durable agent context with review-first cleanup, explicit approval, backup, redaction, and destination classification.
- Safe defaults: bundled inventory and scan scripts are read-only, scan output is redacted by default, and backups use private user state outside Git worktrees.
- Manageable maintenance: the skill depends on Node.js stdlib helpers, public Claude Code memory semantics, and synthetic eval cases instead of private Claude state.

## Eval Set

Cases cover positive triggers, negative triggers, and output-quality expectations:

- `cases/review-stale-auto-memory.md`
- `cases/conflicting-claude-md-files.md`
- `cases/path-scoped-rule-placement.md`
- `cases/claude-local-private-boundary.md`
- `cases/managed-policy-readonly.md`
- `cases/settings-hook-destination.md`
- `cases/sensitive-memory-redaction.md`
- `cases/codex-memory-negative.md`
- `cases/cursor-rules-negative.md`
- `cases/claude-app-memory-negative.md`
- `cases/api-memory-stores-negative.md`
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

Passing outputs expose all eight workflows with `plan-run-cleanup-file` first and Recommended, announce and proceed with an intent-bound route when clear, ask on ambiguity, and keep agent-initiated activation read-only unless cleanup was explicitly requested. Every route performs the same full review. Chat routes create no durable report; file routes use one redacted record. Mutating routes require exact-file backups, Plan routes use the native lifecycle when supported, and direct cleanup is restricted to high-confidence atomic edits in existing editable Claude context.

## Maintenance Guardrails

- Do not add a recursive `auto` workflow or alter the canonical eight-route order.
- Do not claim Claude app memory or Anthropic API Memory Stores support.
- Do not edit managed policy files by default.
- Do not add Claude plugin metadata without a supporting ADR.
- Prefer new eval evidence over longer runtime instructions.
