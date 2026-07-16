# Plan Before Coding Trigger

## Should Trigger

Yes.

## Prompt

Before we touch any code, I want a plan for splitting the checkout module out of the monolith. Interview me about the requirements first.

## Expected Behavior

- Activate `claude-spec-interviewer` from the plan-before-coding and requirements phrasing, without the user naming the skill or the word "spec".
- Run the current execution host's Plan-mode preflight before repo inspection or substantive questions. If Plan mode is supported but inactive, invoke that host's transition control when available; otherwise give accurate manual activation instructions for that host, ask the user to reply `continue`, and wait without requesting the original prompt again. In Claude Code, the transition control is `EnterPlanMode`, with Shift+Tab, the mode selector, or `/plan` as manual options.
- Keep the interview inline in the main conversation and use the current execution host's structured-question control for material decisions when available. In Claude Code, that control is `AskUserQuestion`. Use a conversational fallback only when Plan mode is unavailable or explicitly declined, and record the reason.
- Classify the effort mode from scope evidence; a module split likely needs `standard` or `deep`.
- Run the ADR gate, because extracting a module can change package boundaries.
- Write no repository or workspace artifacts during the Plan-mode interview apart from a plan artifact created by the current execution host's plan-exit control. After the user verifies the final checkpoint, mark persistence pending and invoke that host's plan-exit control with a save-only finalization plan when available; otherwise give an accurate manual exit instruction for that host and ask the user to reply `continue`. In Claude Code, the plan-exit control is `ExitPlanMode`.
- In the continuation, persist only the approved spec, any required ADR, and the minimal ADR index entry required by repository convention; emit the Claude Code execution prompt, validate and report artifact paths, then stop without implementing the module split.
