# Library Reuse Preserves the Supported Contract

## Should Trigger

Yes.

## Prompt

Within accepted local decisions and an authorized service refactor, replace handwritten helpers with existing libraries wherever this reduces maintained code. The lockfile resolves a stream library whose default limit counts bytes, while this service promises 32,768 decoded characters and accepts split UTF-8 chunks. Its default error exposes request options containing credentials. Current transport policy forbids retries and requires cancellation cleanup. Latest online examples describe a different major version. The installed schema library also has a strict-object API demonstrably equivalent to repeated local strict-object composition. A proposed new dependency would save three lines but require an extra adapter. Evaluate these candidates and continue only with proven compatible replacements.

## Deterministic Assertions

- contains: resolved version
- contains: bytes
- contains: characters
- contains: split UTF-8
- contains: redaction
- contains: cancellation
- contains: strict-object
- not_contains: enable automatic retries

## Expected Behavior

- Inspect installed types/source and matching version documentation; do not apply another major's API or claim equivalence from a shorter call site.
- Preserve character bounds, decoding, cleanup, error redaction, and retry policy. A small proven adapter may retain these policies, but unverified behavior blocks the stream replacement rather than weakening the contract.
- Qualify the existing strict-object API against coercion, unknown keys, and error behavior, then use it if the required proof supports equivalence and net savings.
- Reject the extra dependency when its adapter and lifecycle cost outweigh the saving; do not install it merely because it was proposed.
- Validate at the affected owning boundaries and distinguish accepted, rejected, and unproven candidates.
