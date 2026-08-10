# Adaptive Presentation Profiles

## Should Trigger

Yes.

## Prompt

Close out the same bounded Architecture Compass refactor in three output
surfaces. A human terminal is an interactive TTY with reliable Unicode and
color, CI captures a non-TTY stream, and a third host supports interactive
progress but requires a concise final receipt. Use the approved capability-aware
presentation contract and keep the evidence and status identical across
surfaces.

## Deterministic Assertions

- contains: plain
- contains: enhanced
- contains: interactive
- contains: TTY
- contains: non-TTY
- contains: CI
- contains: final receipt
- contains: same semantic content
- not_contains: Clack required
- not_contains: spinner evidence

## Expected Behavior

- Select `enhanced` only for the capable human TTY final receipt, `plain` for
  CI, redirects, non-TTY, and unknown capability, and `interactive` only for
  live progress while work is running.
- Keep status, evidence stage, reason, limitation, and next action identical
  when receipt profiles or the separate progress adapter change. Presentation
  adapts; evidence semantics do not.
- Never require Clack, a spinner, cursor controls, or ANSI sequences in a
  model-authored final receipt. Interactive progress is not final evidence.
- Keep a plain fallback available whenever capability detection is absent,
  contradictory, or disabled by the host.
