# Order Lifecycle State Machine

## Prompt

```text
Create an editable draw.io lifecycle diagram for an order moving through Draft, Submitted, Authorized, Fulfilled, Cancelled, and Refunded, including guarded and invalid transitions.
```

## Should Trigger

Yes

## Split Family

state-machine

## Expected Behavior

- Use explicit initial and final states plus recognizable state-machine notation.
- Label transitions with triggers and guards where behavior depends on a condition.
- Represent invalid transitions as constraints or notes, not as valid runtime paths.
- Route loops and alternate paths so labels do not collide with state borders.

## Deterministic Assertions

- regex: initial state|start state
- contains: final state
- contains: guard
- regex: invalid transition|constraint
