# Plan Before Coding Trigger

## Should Trigger

Yes.

## Prompt

Before we touch any code, I want a plan for splitting the checkout module out of the monolith. Interview me about the requirements first.

## Expected Behavior

- Activate `cursor-spec-interviewer` from the plan-before-coding and requirements phrasing, without the user naming the skill or the word "spec".
- Run the native Plan Mode preflight before substantive interviewing. If Plan Mode is inactive, request the user-approved transition and wait; if the transition request is unavailable, give the correct Shift+Tab or Cursor CLI instruction without claiming the skill changed modes.
- Classify the effort mode from scope evidence; a module split likely needs `standard` or `deep`.
- Use Cursor's structured question tool for material decisions after Plan Mode is active, and make no file changes during the interview.
- Run the ADR gate, because extracting a module can change package boundaries.
- After the user verifies the checkpoint, produce a save-only continuation and mark persistence pending. Outside Plan Mode, persist only the approved spec, required ADR, and the minimal ADR index entry required by repository convention; emit the Cursor execution prompt and stop without implementing the module split.
