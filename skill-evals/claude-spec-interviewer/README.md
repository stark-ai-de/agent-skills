# claude-spec-interviewer Eval Proof

This folder contains the initial promotion proof for `claude-spec-interviewer`.

## Promotion Rationale

- Broad utility: applies to fuzzy features, refactors, migrations, bugfixes, and architecture work.
- Clear boundary: excludes tiny direct edits and already complete implementation specs.
- High value: produces implementation specs, ADR gate results, validation plans, and Claude Code execution prompts.
- Durable output: verifies final scope, saves the spec, and creates ADR files only when required.
- Claude Code fit: requires native Plan mode when supported, uses `EnterPlanMode`, `AskUserQuestion`, and `ExitPlanMode` when available, and keeps repository artifacts read-only and the interview inline before save-only finalization. It treats `CLAUDE.md`, `.claude/rules/**/*.md`, and auto memory as inspectable evidence without turning implementation specs into Claude Code memory or rules by default.
- Manageable maintenance: mostly repo-workflow guidance plus bundled templates and rubrics.

## Eval Set

Cases cover positive triggers, negative triggers, and output-quality expectations:

- `cases/fuzzy-refactor-request.md`
- `cases/vague-feature-request.md`
- `cases/plan-before-coding-trigger.md`
- `cases/native-plan-mode-lifecycle.md`
- `cases/native-plan-mode-fallbacks.md`
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

Passing outputs must run the native Plan-mode preflight before substantive interviewing. When Plan mode is supported but inactive and not explicitly declined, the skill must invoke `EnterPlanMode` when available; otherwise it asks the user to switch with Shift+Tab, the mode selector, or `/plan`, then reply `continue` without resending the request. The Plan-mode interview must keep repository/workspace artifacts read-only and stay in the main conversation; the host-managed `ExitPlanMode` plan is allowed. After the verified checkpoint, the skill must mark persistence pending and invoke `ExitPlanMode` with a save-only plan when available, using manual exit only as fallback. Only after the continuation persists the approved spec, any required ADR, and the minimal ADR index entry required by repository convention; emits the Claude Code execution prompt; and stops without implementation may the run report completion.

If Plan mode is unavailable or explicitly declined, passing outputs must record `unavailable` or `declined` plus the reason and continue the interview conversationally. If persistence itself is explicitly declined or blocked, passing outputs must write no files, return the complete save-ready spec and any ADR draft in chat, and report the proposed path plus the decline or blocker.
