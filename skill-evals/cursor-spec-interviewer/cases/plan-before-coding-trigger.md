# Plan Before Coding Trigger

## Should Trigger

Yes.

## Prompt

Before we touch any code, I want a plan for splitting the checkout module out of the monolith. Interview me about the requirements first.

## Expected Behavior

- Activate `cursor-spec-interviewer` for plan-before-coding requirements work without requiring the word “spec”.
- A request for an implementation plan does not prove native Plan is active. Respect an explicit request to use the native mode, and recommend it for substantial open work without blocking permissible reads or questions on a manual switch.
- Use current execution-host controls when exposed and allowed; otherwise interview conversationally. Keep the interview read-only.
- Classify the likely module split as standard or deep and run the ADR gate for changed boundaries.
- Prepare the complete draft with criteria, validation and rollout before one positive checkpoint covering content and concrete writes.
- Reuse approval across any required host exit; persist only approved spec/ADR/minimal index artifacts with known write permissions, emit the target execution prompt, and stop the interviewer handoff without implementing the split.
