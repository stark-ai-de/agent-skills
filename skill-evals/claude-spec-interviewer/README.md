# claude-spec-interviewer Eval Proof

This folder contains the initial promotion proof for `claude-spec-interviewer`.

## Promotion Rationale

- Broad utility: applies to fuzzy features, refactors, migrations, bugfixes, and architecture work.
- Clear boundary: excludes tiny direct edits and already complete implementation specs.
- High value: produces implementation specs, ADR gate results, validation plans, and Claude Code execution prompts.
- Durable output: verifies final scope, saves the spec, and creates ADR files only when required.
- Cross-host Claude Code fit: uses the current execution host's Plan-mode lifecycle and structured-question controls, with `EnterPlanMode`, `AskUserQuestion`, and `ExitPlanMode` applying only when Claude Code executes the skill. It keeps `CLAUDE.md`, `.claude/rules/**/*.md`, auto memory, and the execution prompt Claude Code-targeted while specs and ADRs remain repository-owned artifacts.
- Manageable maintenance: mostly repo-workflow guidance plus bundled templates and rubrics.

## Eval Set

Cases cover positive triggers, negative triggers, and output-quality expectations:

- `cases/fuzzy-refactor-request.md`
- `cases/vague-feature-request.md`
- `cases/plan-before-coding-trigger.md`
- `cases/native-plan-mode-lifecycle.md`
- `cases/native-plan-mode-fallbacks.md`
- `cases/codex-execution-host.md`
- `cases/claude-md-evidence.md`
- `cases/claude-rules-adr-implications.md`
- `cases/docs-producing-interview-request.md`
- `cases/no-spec-structure-repo.md`
- `cases/declined-persistence.md`
- `cases/already-specified-negative.md`
- `cases/claude-memory-curator-negative.md`
- `cases/codex-memory-curator-negative.md`
- `cases/direct-implementation-negative.md`

Use `rubric.md` to grade outputs. `runs/` stores run summaries and evidence.

Passing outputs must identify the current execution host and run that host's Plan-mode preflight before substantive interviewing. When Plan mode is supported but inactive and not explicitly declined, the skill must invoke that host's transition control when available; otherwise it gives accurate manual activation instructions for that host and waits for `continue` without requesting the original prompt again. The Plan-mode interview must keep repository/workspace artifacts read-only and stay in the main conversation; only a plan artifact created by the current host's plan-exit control is allowed. After the verified checkpoint, the skill must mark persistence pending and use that host's plan-exit control with a save-only plan, using manual exit only when no such control exists. In Claude Code, the lifecycle controls are `EnterPlanMode`, `AskUserQuestion`, and `ExitPlanMode`. Only after the continuation persists the repository-owned approved spec, any required ADR, and the convention-required minimal ADR index entry; emits the Claude Code-targeted execution prompt; and stops without implementation may the run report completion.

If Plan mode is unavailable or explicitly declined, passing outputs must record `unavailable` or `declined` plus the reason and continue the interview conversationally. If persistence itself is explicitly declined or blocked, passing outputs must write no files, return the complete save-ready spec and any ADR draft in chat, and report the proposed path plus the decline or blocker.

The 2026-07-13 Codex run is historical routing evidence from an environment with only `claude-spec-interviewer` installed; it does not prove competing-skill selection, checkpoint verification, Plan-mode exit, or save-only persistence for the strengthened cross-host case.
