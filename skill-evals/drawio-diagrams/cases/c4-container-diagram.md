# C4 Container Diagram

## Prompt

```text
Use $drawio-diagrams to create an editable C4-style container diagram for Web App, API, Worker, Event Bus, Database, and Object Storage.
```

## Should Trigger

Yes

## Expected Behavior

- Use C4/container-like grouping and labels without relying on unavailable external libraries.
- Show directional relationships clearly.
- Keep elements editable as draw.io cells.
- Validate the result and report warnings.

## Deterministic Assertions

- contains: .drawio
- contains: editable
- contains: validate_drawio.py
