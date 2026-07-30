# codex-memory-curator Eval Proof

This folder contains the initial promotion proof for `codex-memory-curator`.

## Promotion Rationale

- Broad utility: applies when Codex memory state is stale, noisy, repo-specific, sensitive, or actively degrading work.
- Clear boundary: excludes ordinary repo documentation cleanup and generic prompt engineering unless memory files or config are part of the request.
- High value: protects user-owned durable state with review-first cleanup, explicit approval, backup, redaction, and destination classification.
- Safe defaults: bundled scripts are non-interactive; inventory and risk scanning are read-only, scan output is redacted by default, and backups use private user state outside Git worktrees and the resolved Codex memories source tree.
- Manageable maintenance: the skill depends on Node.js stdlib helpers, repo-local references, and synthetic eval fixtures instead of runtime-specific APIs.

## Eval Set

Cases cover positive triggers, negative triggers, and output-quality expectations:

- `trigger-eval-queries.md`
- `cases/review-stale-repo-specific-memory.md`
- `cases/sensitive-memory-redaction.md`
- `cases/config-tuning-request.md`
- `cases/generic-docs-cleanup-negative.md`
- `cases/redacted-risk-scan-json.md`
- `cases/structured-cleanup-plan-artifact.md`
- `cases/cross-source-conflict-detection.md`
- `cases/generated-state-boundary.md`
- `cases/unknown-schema-proposal.md`
- `cases/approval-denied-no-edit.md`
- `cases/baseline-comparison.md`
- `cases/explicit-start-selection.md`
- `cases/implicit-selection-no-start.md`
- `cases/agent-initiated-review-boundary.md`
- `cases/direct-cleanup-boundary.md`
- `cases/backup-manifest-reconciliation.md`
- `cases/file-persistence-failure.md`
- `cases/plan-mode-lifecycle.md`

Use `rubric.md` to grade outputs. `runs/` stores run summaries and evidence.

Passing outputs expose all eight workflows with `plan-run-cleanup-file` first and Recommended, announce and proceed with an intent-bound route when clear, ask on ambiguity, and keep agent-initiated activation read-only unless cleanup was explicitly requested. Every route performs the same full review. Chat routes create no durable report; file routes use one redacted record. Mutating routes require exact-file backups, Plan routes use the native lifecycle when supported, and direct cleanup is restricted to high-confidence atomic edits in existing editable Codex memory.

## Maintenance Guardrails

- Do not add a recursive `auto` workflow or alter the canonical eight-route order.
- Do not add more primary classifications unless an eval proves the current taxonomy cannot express a real case.
- Do not rewrite generated evidence by default; use it as context for curated memory decisions.
- Prefer new eval evidence over longer runtime instructions.
