# Native Plan Mode Conversational Fallbacks

## Should Trigger

Yes, for all three variants.

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

- Continue the full read-only interview in all three variants, preserving material questions, source challenge, ADR gate and the same final checkpoint.
- Distinguish proven unavailable from explicitly declined and indeterminate controls; do not claim technical absence from missing evidence.
- Ask conversationally when structured question tools are unavailable. Do not require a mode switch simply to inspect or discuss requirements.
- Preserve an explicit refusal without recommending Plan again. A refusal does not exit an already active mode.
- Unknown Plan or permission state blocks writes, not permissible conversation. Resolve only the relevant state before requested persistence.
- Explicit chat-only output completes its requested delivery; a blocked requested save stays pending.
