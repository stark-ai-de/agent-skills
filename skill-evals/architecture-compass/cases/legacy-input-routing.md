# Legacy Input Routing Without Public Workflow Expansion

## Should Trigger

Yes.

## Prompt

Show how Architecture Compass interprets these historical invocation labels
without exposing them as new public workflows: `setup-existing-repo`,
`setup-new-repo`, `new-repo-bootstrap`, `pr-review`, `new-implementation`,
`docs-sync`, and `stack-deviation`. Account for whether complete governance
already resolves a bounded change and whether implementation is requested.

## Deterministic Assertions

- contains: setup-existing-repo -> setup
- contains: setup-new-repo -> setup
- contains: new-repo-bootstrap -> setup
- contains: pr-review -> audit
- contains: new-implementation -> refactor when fully governed
- contains: docs-sync -> refactor when fully governed
- contains: stack-deviation -> refactor when fully governed
- contains: otherwise -> plan-refactor or plan-run-refactor
- contains: setup, audit, refactor, plan-refactor, plan-run-refactor
- not_contains: Selected workflow: pr-review
- not_contains: Selected workflow: stack-deviation

## Expected Behavior

- Treat every historical label as an input signal and route it into exactly one
  of the five public workflows; do not publish aliases as additional workflows.
- Route all three setup labels to `setup` and `pr-review` to the strict
  read-only `audit` workflow.
- Route `new-implementation`, `docs-sync`, and `stack-deviation` to bounded
  `refactor` only when accepted governance completely resolves the requested
  reversible change.
- Otherwise choose `plan-refactor` when the requested outcome stops after
  approved planning artifacts, or `plan-run-refactor` when the requested
  outcome includes later implementation.
- Preserve the user's scope and operational authority; a legacy label cannot
  authorize mutation, publication, deployment, or a durable architecture
  override.
