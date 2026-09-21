# Clear Plan-only Refactor Intent

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan and persist a repository refactor, but do not implement it.

## Deterministic Assertions

- contains: Selected workflow: plan-refactor
- contains: Planning capability
- contains: exit active Plan mode before persistence
- contains: Execution status: not requested

## Expected Behavior

Select `plan-refactor`; respect active or requested native Plan and recommend it where useful. Continue safe conversation without mandatory activation, obtain one approval of the complete specification and named save scope, exit active Plan mode before persistence, validate the saved specification, and stop without source implementation.
