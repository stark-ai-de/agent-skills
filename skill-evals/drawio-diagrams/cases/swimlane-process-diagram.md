# Swimlane Process Diagram

## Prompt

```text
Use $drawio-diagrams to create an editable swimlane process diagram for Sales, Billing, Support, and Finance handoffs.
```

## Should Trigger

Yes

## Expected Behavior

- Use swimlanes or grouped containers for roles.
- Keep process steps editable and aligned.
- Route handoff arrows between lanes without piercing labels.
- Validate the `.drawio` XML and report warnings.

## Deterministic Assertions

- contains: swimlane
- contains: labels
- contains: validate_drawio.py
