# codex-spec-interviewer Eval Proof

This folder contains the initial promotion proof for `codex-spec-interviewer`.

## Promotion Rationale

- Broad utility: applies to fuzzy features, refactors, migrations, bugfixes, and architecture work.
- Clear boundary: excludes tiny direct edits and already complete implementation specs.
- High value: produces implementation specs, ADR gate results, validation plans, and Codex execution prompts.
- Durable output: verifies final scope, saves the spec, and creates ADR files only when required.
- Manageable maintenance: mostly repo-workflow guidance plus bundled templates and rubrics.

## Eval Set

Cases cover positive triggers, negative triggers, and output-quality expectations. The set now includes enough positive cases for the SkillOpt official-parity data floor of at least 20 positive cases with held-out validation and test splits.

Representative cases:

- `cases/fuzzy-refactor-request.md`
- `cases/vague-feature-request.md`
- `cases/architecture-change-needs-adr.md`
- `cases/api-migration-plan.md`
- `cases/security-sensitive-refactor.md`
- `cases/workspace-safety-boundary.md`
- `cases/already-specified-negative.md`
- `cases/direct-implementation-negative.md`

Use `rubric.md` to grade outputs. `runs/` stores run summaries and evidence.

Passing outputs must include a user-verified finalization checkpoint and persisted spec/ADR artifact paths, not only chat-rendered drafts.

`## Deterministic Assertions` sections provide lightweight non-LLM checks for recurring proof requirements such as validation, ADR gate coverage, rollback notes, and secret-handling boundaries.
