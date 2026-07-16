# Codex Execution Host Full Lifecycle

## Runtime Context

- Codex is the execution host, with its Plan mode and structured-question lifecycle available.
- `codex-spec-interviewer`, `cursor-spec-interviewer`, and `claude-spec-interviewer` are all installed.
- The disposable repository contains `CLAUDE.md`, `.claude/rules/session-boundary.md`, an existing `docs/specs/` convention, accepted ADRs under `docs/adrs/`, and an ADR index at `docs/adrs.md`.

## Initial Prompt

Prepare a Claude Code-ready implementation spec for separating cookie parsing from session persistence. Preserve the constraints in `CLAUDE.md` and `.claude/rules`, interview me, challenge the design against repository evidence, and do not implement it. Select the appropriate installed skill without being given its name.

## Interaction Script

1. Answer the first material question: preserve current cookie and session compatibility, limit the first slice to the server boundary, and require rollback to the existing composition.
2. Answer any independent validation or rollout question with the repository's discovered commands and a canary-first rollout; do not approve invented commands.
3. At the final checkpoint, reply: `Verified. Persist the approved repository artifacts after leaving Plan mode.`
4. Approve Codex's plan-exit handoff, or manually exit when Codex exposes no plan-exit control, then reply `continue` for save-only finalization.

## Expected Behavior

- Selects `claude-spec-interviewer` from the Claude Code target terms despite the competing interviewer skills; it does not redirect to `codex-spec-interviewer` merely because Codex executes it.
- Uses Codex's planning, structured-question, transition, and plan-exit controls throughout. It does not invoke or require Claude-only `EnterPlanMode`, `AskUserQuestion`, or `ExitPlanMode` controls.
- Treats `CLAUDE.md` and `.claude/rules` as Claude Code-targeted evidence and emits a Claude Code-targeted execution prompt.
- Treats the implementation spec, required ADR, and ADR index entry as repository-owned artifacts, using the repository's discovered paths and conventions rather than labeling them Claude-specific.
- Completes the substantive interview, source challenge, ADR gate, validation and rollout plan, and an explicit checkpoint covering scope, non-goals, assumptions, risks, validation, ADR result, and artifact paths.
- Writes no repository or workspace artifacts in Plan mode. After checkpoint verification, reports persistence pending and exits through Codex's plan-exit control or an accurate manual handoff.
- In save-only finalization, writes only the approved spec, any required ADR, and the convention-required minimal ADR index entry; validates and reports their paths, emits the Claude Code execution prompt, and stops without implementing the refactor.
- Does not report completion before persistence succeeds. If persistence is blocked, writes nothing and returns complete save-ready artifacts with proposed repository paths and the blocker.
