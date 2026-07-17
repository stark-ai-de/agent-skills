# BPMN Collaboration Semantics

## Prompt

```text
Create an editable draw.io BPMN collaboration for a customer order: customer and merchant are separate participants, payment approval crosses the participant boundary, an exclusive gateway handles approved versus declined, and a timer catches fulfillment timeout. Keep animation on where appropriate.
```

## Should Trigger

Yes

## Expected Behavior

- Use pools or lanes, typed start/intermediate/end events, tasks, an exclusive gateway, and a timer event.
- Use sequence flow only within a participant and message flow across participants; label gateway branches.
- Animate eligible process execution flow while keeping message annotations, associations, pool boundaries, and other structural notation static.
- Preserve BPMN notation instead of replacing tasks and events with generic icon cards.

## Deterministic Assertions

- regex: pool|lane|participant
- regex: exclusive gateway|XOR
- contains: message flow
- contains: timer
- regex: structural.*static|static.*structural
- contains: validate_drawio.py
