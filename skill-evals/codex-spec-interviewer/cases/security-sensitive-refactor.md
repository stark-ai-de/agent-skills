# Security Sensitive Refactor

## Should Trigger

Yes.

## Prompt

Refactor token handling so secrets never appear in logs. I need the spec to be strict about privacy and validation.

## Deterministic Assertions

- contains: secret
- contains: logging
- contains: validation
- contains: security

## Expected Behavior

- Treat secret handling as high-risk and source-check current logging behavior.
- Include tests or checks that prove values are redacted.
- Avoid printing, copying, or inventing secret values.
- Include review focus for privacy and rollback.
