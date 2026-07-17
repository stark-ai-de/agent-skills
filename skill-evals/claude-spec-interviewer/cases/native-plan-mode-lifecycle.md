# Native Plan Mode Lifecycle

## Should Trigger

Yes.

## Prompt

`/claude-spec-interviewer` Help me define a production-ready redesign of our notification retry flow before anyone implements it.

Assume Claude Code supports native Plan mode, `EnterPlanMode`, `AskUserQuestion`, and `ExitPlanMode`, but Plan mode is not active when the skill is invoked.

## Expected Behavior

- Before repo inspection or substantive questions, invoke `EnterPlanMode` and continue only after the host confirms Plan mode is active.
- If `EnterPlanMode` is unavailable, tell the user to switch with Shift+Tab, the mode selector, or `/plan`, then reply `continue`; do not ask them to resend the request.
- Continue the interview inline without forking and use `AskUserQuestion` for material decisions when available.
- Inspect relevant repo evidence read-only, complete the source challenge and ADR gate, and write no repository or workspace artifacts while Plan mode is active; allow only the host-managed `ExitPlanMode` plan.
- After explicit verification of scope, non-goals, assumptions, risks, validation, ADR result, and artifact paths, report `Persistence status: pending` and invoke `ExitPlanMode` with a plan limited to save-only finalization.
- After the user approves `ExitPlanMode`, persist only the approved spec, any required ADR, and the convention-required minimal ADR index entry; emit the Claude Code execution prompt, validate and report the artifact paths, then stop without implementing the retry redesign. If `ExitPlanMode` is unavailable, tell the user to exit Plan mode with Shift+Tab or the mode selector and reply `continue` before the same save-only handoff.
- Do not report completion before persistence succeeds. If Plan mode becomes unavailable or the user explicitly declines it, record that fallback before continuing conversationally.
