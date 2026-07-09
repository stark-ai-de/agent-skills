# claude-spec-interviewer Eval Proof

This folder contains the initial promotion proof for `claude-spec-interviewer`.

## Promotion Rationale

- Broad utility: applies to fuzzy features, refactors, migrations, bugfixes, and architecture work.
- Clear boundary: excludes tiny direct edits and already complete implementation specs.
- High value: produces implementation specs, ADR gate results, validation plans, and Claude Code execution prompts.
- Durable output: verifies final scope, saves the spec, and creates ADR files only when required.
- Claude Code fit: treats `CLAUDE.md`, `.claude/rules/**/*.md`, and auto memory as inspectable evidence without turning implementation specs into Claude Code memory or rules by default.
- Manageable maintenance: mostly repo-workflow guidance plus bundled templates and rubrics.

## Eval Set

Cases cover positive triggers, negative triggers, and output-quality expectations:

- `cases/fuzzy-refactor-request.md`
- `cases/vague-feature-request.md`
- `cases/plan-before-coding-trigger.md`
- `cases/claude-md-evidence.md`
- `cases/claude-rules-adr-implications.md`
- `cases/grill-with-docs-reference.md`
- `cases/no-spec-structure-repo.md`
- `cases/declined-persistence.md`
- `cases/already-specified-negative.md`
- `cases/claude-memory-curator-negative.md`
- `cases/codex-memory-curator-negative.md`
- `cases/direct-implementation-negative.md`

Use `rubric.md` to grade outputs. `runs/` stores run summaries and evidence.

Passing outputs must include a user-verified finalization checkpoint and persisted spec/ADR artifact paths, not only chat-rendered drafts, except when persistence is explicitly declined or blocked. In declined or blocked persistence cases, passing outputs must write no files, return the complete save-ready spec and any ADR draft in chat, and report the path that would have been used plus the decline or blocker.
