# codex-spec-interviewer Eval Proof

This folder contains the initial promotion proof for `codex-spec-interviewer`.

## Promotion Rationale

- Broad utility: applies to fuzzy features, refactors, migrations, bugfixes, and architecture work.
- Clear boundary: excludes tiny direct edits and already complete implementation specs.
- High value: produces implementation specs, ADR gate results, validation plans, and Codex execution prompts.
- Durable output: verifies final scope, saves the spec, and creates ADR files only when required.
- Native interaction: uses Codex Plan mode and structured user questions when the current surface supports them.
- Manageable maintenance: mostly repo-workflow guidance plus bundled templates and rubrics.

## Eval Set

Cases cover positive triggers, negative triggers, and output-quality expectations. The set now includes enough positive cases for the SkillOpt official-parity data floor of at least 20 positive cases with held-out validation and test splits.

Representative cases:

- `cases/fuzzy-refactor-request.md`
- `cases/vague-feature-request.md`
- `cases/plan-before-coding-trigger.md`
- `cases/native-plan-mode-lifecycle.md`
- `cases/native-plan-mode-fallbacks.md`
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

## Native Plan Mode Lifecycle

When the current Codex surface supports native Plan mode, positive cases are evaluated as a multi-turn lifecycle:

1. A supported-but-inactive invocation stops before substantive interviewing and returns `/plan Use $codex-spec-interviewer to continue this request: <original request>` with the original request substituted.
2. The resumed Plan-mode interview uses `request_user_input` when available and performs read-only evidence gathering with no file writes.
3. A verified checkpoint ends with approved artifact paths, `Persistence status: pending Plan-mode exit`, and a save-only continuation. Pending persistence is not completion.
4. After the user exits Plan mode, the continuation persists only the approved spec, any required ADR, and the minimal ADR index entry required by repository convention; it validates them, emits the Codex execution prompt, reports paths, and stops without implementation.

Conversational fallback passes only when native Plan mode is definitely unavailable or the user explicitly declined it, the outcome is recorded as `unavailable` or `declined`, and the interview continues interactively in the conversation. Indeterminate support/state uses the supported-but-inactive `/plan` handoff and never falls back.

Passing completed outputs must include a user-verified finalization checkpoint and persisted spec/ADR artifact paths, not only chat-rendered drafts. In declined or blocked persistence cases, passing outputs must write no files, return the complete save-ready spec and any ADR draft in chat, report the path that would have been used plus the decline or blocker, and state that normal persistence completion was not met.

`## Deterministic Assertions` sections provide lightweight non-LLM checks for recurring proof requirements such as validation, ADR gate coverage, rollback notes, and secret-handling boundaries.
