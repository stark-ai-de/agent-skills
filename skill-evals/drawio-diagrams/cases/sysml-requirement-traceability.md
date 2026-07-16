# SysML Requirement Traceability

## Prompt

```text
Create an editable draw.io SysML requirements view for a control unit. Include requirement IDs for safe shutdown and response time, the controller block that satisfies them, and verification cases that verify each requirement.
```

## Should Trigger

Yes

## Expected Behavior

- Declare the diagram as a SysML requirements view and keep its abstraction level consistent.
- Preserve requirement IDs and text plus explicit `satisfy` and `verify` relationships.
- Distinguish controller blocks from verification cases without relying on color or decorative vendor logos.
- Keep traceability labels readable and validate the editable source.

## Deterministic Assertions

- contains: SysML
- contains: requirement
- contains: satisfy
- contains: verify
- contains: validate_drawio.py
