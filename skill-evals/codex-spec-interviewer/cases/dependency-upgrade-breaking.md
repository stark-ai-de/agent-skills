# Dependency Upgrade With Breaking Changes

## Should Trigger

Yes.

## Prompt

Upgrade the validation library to the next major version. It has breaking API changes, so write the implementation spec before coding.

## Deterministic Assertions

- contains: breaking
- contains: validation
- contains: rollout
- contains: compatibility

## Expected Behavior

- Inspect current package metadata, usage sites, and validation commands.
- Check current official migration guidance when available.
- Include a phased migration plan and rollback strategy.
- Do not update dependencies directly while creating the spec.
