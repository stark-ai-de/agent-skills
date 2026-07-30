# Ambiguous Workflow Selection

## Should Trigger

Yes.

## Prompt

Use Animated README Logo for this repository.

## Deterministic Assertions

- contains: audit
- contains: create
- contains: transform
- contains: animate
- contains: Selected
- contains: Protected originals
- contains: choose
- not_contains: Provider state: available

## Expected Behavior

Show all four workflows and required mutating outputs. Keep the public `Workflow`, `Source route`, `Selection`, `Write scope and protected originals`, `Provider state`, `Approval state`, `Motion readiness`, and `Animation delivery` unresolved. Because the request does not identify audit, identity creation, faithful transformation, or animation of an acceptable source, ask the user to choose without inspecting assets, discovering providers, or changing files.
