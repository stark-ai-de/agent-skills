# Compact Initial Activation

## Should Trigger

Yes.

## Prompt

Activate Architecture Compass on an unknown host before any workflow has been
selected. Explain the available capability-aware output behavior briefly, then
wait for the user's task and authority. The first response is activation and
routing information, not a final completion receipt.

## Deterministic Assertions

- contains: compact
- contains: host-neutral
- contains: capability
- contains: workflow
- contains: final receipt
- contains: plain fallback
- not_contains: interactive spinner
- not_contains: marker legend
- not_contains: large decorative box

## Expected Behavior

- Keep activation output compact and host-neutral. It may mention that final
  receipts adapt to host capability, but it must not render a full legend or a
  decorative report before there is a result to report.
- Expose the finite workflow set and ask only for material missing intent,
  scope, persistence, or authority; capability discovery must not invent
  mutation authority.
- State that a plain fallback exists for unknown or unsupported hosts without
  claiming that a renderer, color, or interactive terminal is available.
- Reserve semantic markers and richer framing for concise final receipts after
  evidence exists.
