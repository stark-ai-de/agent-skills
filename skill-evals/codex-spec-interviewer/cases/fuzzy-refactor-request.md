# Fuzzy Refactor Request

## Should Trigger

Yes.

## Prompt

We need to clean up the billing integration. It has grown messy, agents keep touching too many files, and I want a proper plan before anyone starts coding.

## Expected Behavior

- Ask targeted clarification only where repo inspection cannot answer.
- Inspect repo instructions, existing docs, relevant files, and validation commands.
- Produce a `standard` or `deep` implementation spec depending on scope evidence.
- Include non-goals, file areas, acceptance criteria, validation, risks, rollout notes, and a Codex execution prompt.
- Run the ADR gate and explain whether a durable architecture decision is required.
