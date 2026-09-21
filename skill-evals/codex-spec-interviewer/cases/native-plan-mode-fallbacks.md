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
  `Planning capability: Available but inactive` and request selection of that
  item or provide standalone `/plan`. After confirmed activation, use the
  separate continuation `Use $codex-spec-interviewer to continue this request:
<original request>`. Combine the command and continuation only if this same
  composer also proves inline argument support.
- When Codex web control or state evidence is missing or contradictory, report
  `Planning capability: Indeterminate`, ask for current-composer evidence, and
  wait. Do not fall back or emit the handoff.
- When the user positively enumerates current Codex web controls without Plan,
  report `Planning capability: Unavailable` and record the fallback evidence.

## Expected Behavior

- Continue the full read-only interview in all three variants, preserving material questions, source challenge, ADR gate and the same final checkpoint.
- Distinguish proven unavailable from explicitly declined and indeterminate controls; do not claim technical absence from missing evidence.
- Ask conversationally when structured question tools are unavailable. Do not require a mode switch simply to inspect or discuss requirements.
- Preserve an explicit refusal without recommending Plan again. A refusal does not exit an already active mode.
- Unknown Plan or permission state blocks writes, not permissible conversation. Resolve only the relevant state before requested persistence.
- Explicit chat-only output completes its requested delivery; a blocked requested save stays pending.
