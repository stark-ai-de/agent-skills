# Receipt Accessibility and Text Fallback

## Should Trigger

Yes.

## Prompt

Produce a concise Architecture Compass completion receipt for a log-oriented
host. Unicode glyphs are unreliable, `NO_COLOR` is set, color is disabled, and
the output will be copied into an issue and parsed by a reader without terminal
rendering. The checks include one verified result, one intentionally not-run
result, and one unavailable evidence stage. Preserve the exact evidence
semantics and explain every limitation.

## Deterministic Assertions

- contains: Verified:
- contains: Info:
- contains: Not run:
- contains: Attention:
- contains: NO_COLOR
- contains: evidence stage
- contains: reason
- contains: limitation
- not_contains: ANSI escape
- not_contains: color-only status

## Expected Behavior

- Use explicit textual prefixes and statuses when Unicode or color is
  unsuitable; a reader must understand the receipt after markers and styling
  are removed.
- Preserve the four semantic categories from AC-ADR-050 without making the
  not-run or unavailable checks look verified.
- Keep the status, evidence stage, reason, limitation, and next action in text,
  and keep skipped or unavailable evidence visible in the final receipt.
- Do not place emoji, ANSI controls, or color-only meaning in machine data,
  commands, filenames, raw logs, or dense evidence tables.
