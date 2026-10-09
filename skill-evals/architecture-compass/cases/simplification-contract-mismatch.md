# Shorter code with different contracts

## Should Trigger

Yes.

## Prompt

Review simplification candidates in a governed backend. This is an audit only.
One popular response reader limits characters but the service must limit bytes
and pin the validated DNS address to the socket. A process wrapper streams large
output with backpressure; another buffers finite output and passes binary
secrets on stdin. Two retention callers share decoding but have different
authorization and deletion policies. A generic retry package cannot represent
the service's durable reservation or unknown-outcome state. Recommend only
contract-compatible reuse and explain what remains custom.

## Deterministic Assertions

- contains: audit
- contains: bytes
- contains: backpressure
- contains: stdin
- contains: unknown-outcome
- not_contains: zero maintenance
- not_contains: implementation completed

## Expected Behavior

- Stay read-only; create no artifact, install no dependency and modify no code.
- Reject the character-limited reader as an equivalent byte-bounded replacement;
  preserve DNS/socket binding and transport trust policy independently of intake.
- Distinguish streaming `spawn` from a candidate finite-buffer `execFile` use.
  Check binary stdin, separate stdout/stderr bounds, errors, timeout and kill
  semantics; no secret appears in arguments or logs.
- Propose sharing only validated common decoding within a compatible owner.
  Keep caller-specific authorization/deletion policies and runtime barriers.
- Retain durable reservation and unknown-outcome handling unless an alternative
  proves their contracts. Popularity and LOC savings do not supply that proof.
- Explain ongoing dependency upgrades, integration and contract-test ownership.
