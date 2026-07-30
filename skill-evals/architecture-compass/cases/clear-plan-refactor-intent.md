# Clear Plan-only Refactor Intent

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan and persist a repository refactor, but do not implement it.

## Deterministic Assertions

- contains: Selected workflow: plan-refactor
- contains: Planning capability
- contains: exit Plan mode before persistence
- contains: Execution status: not requested

## Expected Behavior

Select `plan-refactor`, use native Plan mode when supported, obtain approval there, exit before persisting the approved repository-native specification, validate it, and stop without source implementation.
