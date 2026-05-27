# Observability Instrumentation

## Should Trigger

Yes.

## Prompt

We need better tracing around checkout failures. Write a spec that tells Codex where to instrument and how to validate the signal.

## Deterministic Assertions

- contains: tracing
- contains: observability
- contains: validation
- contains: review focus

## Expected Behavior

- Inspect existing logging, tracing, and error-handling patterns.
- Define expected signal names or fields only when repo evidence supports them.
- Include validation for success and failure paths.
- Keep unrelated analytics or dashboard work out of scope.
