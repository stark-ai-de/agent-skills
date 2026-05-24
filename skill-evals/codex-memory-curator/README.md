# codex-memory-curator Eval Proof

This folder contains the initial promotion proof for `codex-memory-curator`.

## Promotion Rationale

- Broad utility: applies when Codex memory state is stale, noisy, repo-specific, sensitive, or actively degrading work.
- Clear boundary: excludes ordinary repo documentation cleanup and generic prompt engineering unless memory files or config are part of the request.
- High value: protects user-owned durable state with review-first cleanup, explicit approval, backup, redaction, and destination classification.
- Safe defaults: bundled scripts are non-interactive; inventory and risk scanning are read-only, scan output is redacted by default, and backup only creates a copy.
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

Use `rubric.md` to grade outputs. `runs/` stores run summaries and evidence.

Passing outputs must produce a cleanup report before edits, classify every atomic entry with exactly one primary classification, redact sensitive values, cite higher-precedence conflict sources, add a structured cleanup plan when approval needs ID-level precision, and require explicit approval plus backup before cleanup.

## Maintenance Guardrails

- Do not add auto-apply cleanup scripts or interactive cleanup menus.
- Do not add more primary classifications unless an eval proves the current taxonomy cannot express a real case.
- Do not rewrite generated evidence by default; use it as context for curated memory decisions.
- Prefer new eval evidence over longer runtime instructions.
