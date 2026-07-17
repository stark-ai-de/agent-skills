# Plan Before Coding Trigger

## Should Trigger

Yes.

## Prompt

Before we touch any code, I want a plan for splitting the checkout module out of the monolith. Interview me about the requirements first.

## Expected Behavior

- Activate `cursor-spec-interviewer` from the plan-before-coding and requirements phrasing, without the user naming the skill or the word "spec".
- Run the current execution host's Plan Mode preflight before substantive interviewing. If Plan Mode is inactive, request the user-approved transition through that host's control and wait; if no transition control exists, give host-accurate manual activation instructions without claiming the skill changed modes. Cursor-specific Shift+Tab, `/plan`, and `--mode=plan` guidance applies only when Cursor executes the skill.
- Classify the effort mode from scope evidence; a module split likely needs `standard` or `deep`.
- Use the current execution host's structured-question control for material decisions after Plan Mode is active, and make no repository or workspace changes during the interview apart from a plan artifact created by that host's plan-exit control. Use `AskQuestion` only when Cursor executes the skill.
- Run the ADR gate, because extracting a module can change package boundaries.
- After the user verifies the checkpoint, mark persistence pending and invoke the current execution host's plan-exit control with a save-only plan; give a host-accurate manual handoff only when no such control exists. After confirmed exit, persist only the repository-owned approved spec, required ADR, and minimal ADR index entry required by repository convention; emit the Cursor-targeted execution prompt and stop without implementing the module split.
