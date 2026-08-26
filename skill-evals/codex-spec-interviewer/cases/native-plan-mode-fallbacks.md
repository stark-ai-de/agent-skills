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

- The current Codex surface is Codex CLI, the Codex IDE extension, or Codex in
  the ChatGPT desktop app; this Variant C does not cover Codex web.
- The current Codex surface may support native Plan mode, but support or active state cannot be determined reliably.
- The user has not declined Plan mode.

### Prompt

Use $codex-spec-interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Codex Web Observation Cases

These additive cases do not change the Codex CLI/IDE/desktop Variant C.
Codex web uses the observation record because its client listing does not prove
the current composer control.

- When the current Codex web composer visibly exposes inactive `/plan`, report
  `Planning capability: Available but inactive` and return the copy-ready
  `/plan Use $codex-spec-interviewer to continue this request: <original
request>` handoff.
- When Codex web control or state evidence is missing or contradictory, report
  `Planning capability: Indeterminate`, ask for current-composer evidence, and
  wait. Do not fall back or emit the handoff.
- When the user positively enumerates current Codex web controls without Plan,
  report `Planning capability: Unavailable` and record the fallback evidence.

## Expected Behavior

- Run the native Plan-mode preflight before repository exploration or substantive questions.
- For Variant A, record `Plan-mode fallback: unavailable - <evidence>` with the runtime limitation that made Plan mode unavailable.
- For Variant B, record `Plan-mode fallback: explicitly declined - <user statement>`; do not keep requesting `/plan`.
- For Variant C on Codex CLI/IDE/desktop, use the supported-but-inactive `/plan` handoff and wait; never record a fallback from uncertainty. Resume the normal workflow only after the host confirms that native Plan mode is active. Codex web uses its separate observation-gated cases and never emits this handoff from missing evidence.
- For Variants A and B, continue the full interview conversationally, asking one material question at a time and waiting for the answer instead of inferring a complete spec in one response.
- Preserve source challenge, ADR gate, verification checkpoint, artifact-path, validation, and execution-prompt requirements in all three variants.
- Do not treat the mode fallback as a persistence decline. Persist after verification unless the user separately declines persistence or a blocker prevents it.
