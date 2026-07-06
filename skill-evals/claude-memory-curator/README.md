# claude-memory-curator Eval Proof

This folder contains the initial promotion proof for `claude-memory-curator`.

## Promotion Rationale

- Broad utility: applies when Claude Code durable context is stale, noisy, conflicting, unenforced, sensitive, or actively degrading future sessions.
- Clear boundary: covers `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules`, user-level Claude rules, settings, hooks, managed policy evidence, and auto memory; excludes Codex memory, Cursor rules, Claude app account memory, and Anthropic API Memory Stores.
- High value: protects durable agent context with review-first cleanup, explicit approval, backup, redaction, and destination classification.
- Safe defaults: bundled inventory and scan scripts are read-only, scan output is redacted by default, and backup only creates a copy.
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

Use `rubric.md` to grade outputs. `expected/report-shape.md` describes the expected report skeleton. `runs/` stores run summaries and evidence.

Passing outputs must produce a cleanup report before edits, classify every atomic claim with exactly one primary classification, redact sensitive values, cite higher-precedence conflict sources, distinguish context from settings/hooks enforcement, add a structured cleanup plan when approval needs ID-level precision, and require explicit approval plus backup before cleanup.

## Maintenance Guardrails

- Do not add auto-apply cleanup scripts or interactive cleanup menus.
- Do not claim Claude app memory or Anthropic API Memory Stores support.
- Do not edit managed policy files by default.
- Do not add Claude plugin metadata without a supporting ADR.
- Prefer new eval evidence over longer runtime instructions.
