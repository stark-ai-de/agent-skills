# cursor-spec-interviewer Eval Proof

This folder contains the initial promotion proof for `cursor-spec-interviewer`.

## Promotion Rationale

- Broad utility: applies to fuzzy features, refactors, migrations, bugfixes, and architecture work.
- Clear boundary: excludes tiny direct edits and already complete implementation specs.
- High value: produces implementation specs, ADR gate results, validation plans, and Cursor execution prompts.
- Durable output: verifies final scope, saves the spec, and creates ADR files only when required.
- Cursor fit: treats `.cursor/rules/**/*.mdc` as inspectable repo evidence without turning implementation specs into Cursor rules by default.
- Manageable maintenance: mostly repo-workflow guidance plus bundled templates and rubrics.

## Eval Set

Cases cover positive triggers, negative triggers, and output-quality expectations:

- `cases/fuzzy-refactor-request.md`
- `cases/vague-feature-request.md`
- `cases/plan-before-coding-trigger.md`
- `cases/native-plan-mode-lifecycle.md`
- `cases/native-plan-mode-fallbacks.md`
- `cases/architecture-change-needs-adr.md`
- `cases/cursor-rules-adr-implications.md`
- `cases/rule-artifact-request.md`
- `cases/no-spec-structure-repo.md`
- `cases/declined-persistence.md`
- `cases/already-specified-negative.md`
- `cases/codex-memory-curator-negative.md`
- `cases/direct-implementation-negative.md`

Use `rubric.md` to grade outputs. `runs/` stores run summaries and evidence.

Passing outputs must run the native Plan Mode preflight before substantive interviewing. When Plan Mode is available, they must use Cursor's structured question tool, make no file changes during the interview, and finish the verified checkpoint with a save-only continuation. After leaving Plan Mode, the continuation may persist only the approved spec, any required ADR, and the minimal ADR index entry required by repository convention; it must emit the Cursor execution prompt and stop without implementing the feature.

Completion requires persisted spec/ADR artifact paths. While still in Plan Mode, passing outputs must write no files, report the approved artifact paths and pending status, and provide the save-only continuation. Only declined or blocked persistence requires the complete save-ready spec and any ADR draft in chat, the intended paths and reason, and an explicit statement that completion was not met.
