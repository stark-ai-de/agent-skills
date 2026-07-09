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
- `cases/plan-before-coding-trigger.md`
- `cases/architecture-change-needs-adr.md`
- `cases/api-migration-plan.md`
- `cases/security-sensitive-refactor.md`
- `cases/workspace-safety-boundary.md`
- `cases/agents-md-artifact-request.md`
- `cases/no-spec-structure-repo.md`
- `cases/declined-persistence.md`
- `cases/already-specified-negative.md`
- `cases/codex-memory-curator-negative.md`
- `cases/direct-implementation-negative.md`

Use `rubric.md` to grade outputs. `runs/` stores run summaries and evidence.

Passing outputs must include a user-verified finalization checkpoint and persisted spec/ADR artifact paths, not only chat-rendered drafts, except when persistence is explicitly declined or blocked. In declined or blocked persistence cases, passing outputs must write no files, return the complete save-ready spec and any ADR draft in chat, and report the path that would have been used plus the decline or blocker.

`## Deterministic Assertions` sections provide lightweight non-LLM checks for recurring proof requirements such as validation, ADR gate coverage, rollback notes, and secret-handling boundaries.
