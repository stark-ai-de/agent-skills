# Multi-page Diagram

## Prompt

```text
Create a two-page draw.io file: one page for runtime request flow and one page for data flow.
```

## Should Trigger

Yes

## Expected Behavior

- Create descriptive page names.
- Keep repeated entities consistently labeled across pages.
- Validate each page independently.
- Report the multi-page structure in the final answer.

## Deterministic Assertions

- contains: Runtime
- contains: Data Flow
- contains: validate_drawio.py
