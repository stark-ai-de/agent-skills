# Native Plan Mode Conversational Fallbacks

## Should Trigger

Yes, for all three variants.

## Variant A: Plan Mode Unavailable

### Runtime Context

- The current Codex surface does not support native Plan mode.
- `request_user_input` is unavailable.

### Prompt

Use $codex-spec-interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Variant B: User Declines Plan Mode

### Runtime Context

- Native Plan mode is supported but inactive.
- After receiving the `/plan` continuation command, the user replies: "Do not switch modes; continue the interview here."

### Prompt

Use $codex-spec-interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Variant C: Native Plan Mode State Is Indeterminate

### Runtime Context

- The current Codex surface may support native Plan mode, but support or active state cannot be determined reliably.
- The user has not declined Plan mode.

### Prompt

Use $codex-spec-interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Expected Behavior

- Run the native Plan-mode preflight before repository exploration or substantive questions.
- For Variant A, record `Plan-mode fallback: unavailable - <evidence>` with the runtime limitation that made Plan mode unavailable.
- For Variant B, record `Plan-mode fallback: explicitly declined - <user statement>`; do not keep requesting `/plan`.
- For Variant C, use the supported-but-inactive `/plan` handoff and wait; never record a fallback from uncertainty. Resume the normal workflow only after the host confirms that native Plan mode is active.
- For Variants A and B, continue the full interview conversationally, asking one material question at a time and waiting for the answer instead of inferring a complete spec in one response.
- Preserve source challenge, ADR gate, verification checkpoint, artifact-path, validation, and execution-prompt requirements in all three variants.
- Do not treat the mode fallback as a persistence decline. Persist after verification unless the user separately declines persistence or a blocker prevents it.
