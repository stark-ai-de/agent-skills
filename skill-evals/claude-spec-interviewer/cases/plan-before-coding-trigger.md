# Plan Before Coding Trigger

## Should Trigger

Yes.

## Prompt

Before we touch any code, I want a plan for splitting the checkout module out of the monolith. Interview me about the requirements first.

## Expected Behavior

- Activate `claude-spec-interviewer` from the plan-before-coding and requirements phrasing, without the user naming the skill or the word "spec".
- Run the native Plan-mode preflight before repo inspection or substantive questions. If Plan mode is supported but inactive, invoke `EnterPlanMode` when available. If it is unavailable, ask the user to switch with Shift+Tab, the mode selector, or `/plan`, then reply `continue`; do not ask them to resend the request.
- Keep the interview inline in the main conversation and use `AskUserQuestion` for material decisions when available. Use a conversational fallback only when Plan mode is unavailable or explicitly declined, and record the reason.
- Classify the effort mode from scope evidence; a module split likely needs `standard` or `deep`.
- Run the ADR gate, because extracting a module can change package boundaries.
- Write no repository or workspace artifacts during the Plan-mode interview apart from the host-managed `ExitPlanMode` plan. After the user verifies the final checkpoint, mark persistence pending and invoke `ExitPlanMode` with a save-only finalization plan when available; otherwise instruct them to exit Plan mode and reply `continue`.
- In the continuation, persist only the approved spec, any required ADR, and the minimal ADR index entry required by repository convention; emit the Claude Code execution prompt, validate and report artifact paths, then stop without implementing the module split.
