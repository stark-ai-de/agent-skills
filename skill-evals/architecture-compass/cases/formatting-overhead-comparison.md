# Formatting Overhead Comparison

## Should Trigger

Yes.

## Prompt

Evaluate whether the `enhanced` Architecture Compass receipt adds harmful
overhead. Compare `plain` and `enhanced` renderings of the same fixed semantic
receipt, including verified, informational, skipped, and limited outcomes.
Report character, byte, and line counts, and report model-token or instruction
size only when the host can measure it. Distinguish renderer output overhead
from model-token overhead and do not invent a universal hard budget.

## Deterministic Assertions

- contains: plain
- contains: enhanced
- contains: semantic receipt
- contains: character count
- contains: byte count
- contains: line count
- contains: model-token
- contains: renderer overhead
- contains: no hard budget
- not_contains: repeated legend required
- not_contains: decorative block required

## Expected Behavior

- Compare profiles against identical semantic fields and explain any increase
  in characters, bytes, or lines instead of comparing different content.
- Treat renderer-generated decoration as terminal/log bytes and distinguish it
  from additional instruction or model output tokens. Do not claim that box
  drawing alone consumed model tokens.
- Keep the default compact and avoid repeated legends, duplicated statuses,
  large borders, or decoration that obscures evidence limitations.
- Use comparative measurements and reviewable fixtures rather than a
  one-size-fits-all hard token cap; defer a numeric budget until evidence
  justifies one.
