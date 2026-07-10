# Native Plan Mode Conversational Fallbacks

## Should Trigger

Yes, for both variants.

## Variant A: Plan Mode Unavailable

### Runtime Context

- The current Claude Code surface does not support native Plan mode.
- `EnterPlanMode` and `AskUserQuestion` are unavailable.

### Prompt

`/claude-spec-interviewer` Define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Variant B: User Declines Plan Mode

### Runtime Context

- Native Plan mode and `EnterPlanMode` are supported but inactive.
- The initial request explicitly declines Plan mode.

### Prompt

`/claude-spec-interviewer` Do not enter Plan mode; remain in the current mode and interview me here to define a safe migration from polling to webhook delivery.

## Expected Behavior

- Run the Plan-mode preflight before repository exploration or substantive questions.
- For Variant A, record `Plan mode fallback: unavailable` and the runtime evidence or limitation that made Plan mode unavailable; do not give manual switch instructions as if they were usable.
- For Variant B, record `Plan mode fallback: declined` from the initial request and do not invoke `EnterPlanMode`.
- Continue the full interview conversationally in the main conversation, asking one material question at a time and waiting for the answer instead of inferring a complete spec in one response.
- Preserve source challenge, ADR gate, verification checkpoint, artifact-path, validation, and Claude Code execution-prompt requirements in both variants.
- Do not treat the mode fallback as a persistence decline. Persist after verification unless the user separately declines persistence or a blocker prevents it.
