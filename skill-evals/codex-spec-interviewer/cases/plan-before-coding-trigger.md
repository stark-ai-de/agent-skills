# Plan Before Coding Trigger

## Should Trigger

Yes.

## Prompt

Before we touch any code, I want a plan for splitting the checkout module out of the monolith. Interview me about the requirements first.

## Expected Behavior

- Activate `codex-spec-interviewer` from the plan-before-coding and requirements phrasing, without the user naming the skill or the word "spec".
- Classify the effort mode from scope evidence; a module split likely needs `standard` or `deep`.
- Run the ADR gate, because extracting a module can change package boundaries.
- Produce and save a spec with acceptance criteria, validation commands, risks, rollout notes, and a Codex execution prompt.
