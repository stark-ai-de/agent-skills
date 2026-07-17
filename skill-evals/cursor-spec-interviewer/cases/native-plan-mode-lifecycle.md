# Native Plan Mode Lifecycle

## Should Trigger

Yes.

## Prompt

Use `$cursor-spec-interviewer` to turn my rough audit-log feature idea into a Cursor-ready implementation spec. Cursor Plan Mode is available, but it is not active yet.

## Expected Behavior

- Run the Plan Mode preflight before classification, repo exploration, or substantive interview questions.
- Request Cursor's user-approved Plan Mode transition when that capability is exposed, then pause. Never state that the skill switched modes itself.
- If the transition request is unavailable, tell editor users to use Shift+Tab or Cursor CLI users to use `/plan` or `--mode=plan`, then wait. Do not fall back merely because the automated request is missing.
- Once Plan Mode is active, use Cursor's structured question tool for material decisions and keep the full interview read-only.
- Use a conversational fallback only if Plan Mode is unavailable or explicitly declined, and record the reason in the interview summary and final spec assumptions.
- After the verified checkpoint, report the approved repository artifact paths and `Persistence: pending`, then use Cursor's plan-exit control with a save-only plan when exposed. If no plan-exit control exists, tell editor users to toggle out of Plan Mode with Shift+Tab, ask them to reply `continue`, and wait; use only a documented client-visible mode switch on other Cursor surfaces.
- After confirmed exit, persist only the repository-owned approved spec, required ADR, and convention-required minimal ADR index entry; emit the Cursor-targeted execution prompt; report paths; and stop without implementing the audit-log feature.
- If the user remains in Plan Mode, make no writes and do not claim completion.
