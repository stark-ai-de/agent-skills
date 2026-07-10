# Plan Before Coding Trigger

## Should Trigger

Yes.

## Prompt

Before we touch any code, I want a plan for splitting the checkout module out of the monolith. Interview me about the requirements first.

## Expected Behavior

- Activate `codex-spec-interviewer` from the plan-before-coding and requirements phrasing, without the user naming the skill or the word "spec".
- If native Plan mode is supported but inactive, stop before interviewing or repository exploration and return this command with the prompt preserved: `/plan Use $codex-spec-interviewer to continue this request: Before we touch any code, I want a plan for splitting the checkout module out of the monolith. Interview me about the requirements first.`
- After the request resumes in active Plan mode, use `request_user_input` for material decisions whenever available and perform no file writes.
- Classify the effort mode from scope evidence; a module split likely needs `standard` or `deep`.
- Run the ADR gate, because extracting a module can change package boundaries.
- After the user verifies the checkpoint, prepare a spec with acceptance criteria, validation commands, risks, and rollout notes; report persistence as pending and provide the save-only continuation.
- After Plan mode exits, persist only the approved spec, any required ADR, and the minimal ADR index entry required by repository convention; emit the Codex execution prompt and stop without implementing the module split.
