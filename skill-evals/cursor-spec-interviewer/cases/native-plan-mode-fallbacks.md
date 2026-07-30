# Native Plan Mode Conversational Fallbacks

## Should Trigger

Yes, for both variants.

## Variant A: Plan Mode Unavailable

### Runtime Context

- The current Cursor surface does not support Plan Mode.
- Cursor's structured question tool is unavailable.

### Prompt

Use $cursor-spec-interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Variant B: User Declines Plan Mode

### Runtime Context

- Plan Mode is supported but inactive.
- When asked to switch, the user replies: "Stay in Agent mode and continue the interview here."

### Prompt

Use $cursor-spec-interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Variant C: Plan Mode State Is Indeterminate

### Runtime Context

- The current host may support Plan Mode, but support or active state cannot be determined reliably.
- The user has not declined Plan Mode.

### Prompt

Use $cursor-spec-interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Expected Behavior

- Run the Plan Mode preflight before repository exploration or substantive questions.
- For Variant A, record `Plan Mode fallback: unavailable` and the runtime evidence or limitation that made Plan Mode unavailable; do not offer Shift+Tab or `/plan` as if they were usable.
- For Variant B, record `Plan Mode fallback: declined` and the user's explicit choice; do not keep requesting a mode transition.
- For Variant C, treat the state as supported-but-inactive, request the host-accurate transition or manual handoff, and wait; never record a fallback from uncertainty.
- Continue the full interview conversationally, asking one material question at a time and waiting for the answer instead of inferring a complete spec in one response.
- Preserve source challenge, ADR gate, verification checkpoint, artifact-path, validation, and Cursor execution-prompt requirements in both variants.
- Do not treat the mode fallback as a persistence decline. Persist after verification unless the user separately declines persistence or a blocker prevents it.
