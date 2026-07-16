# PlantUML Class Source Negative

## Prompt

```text
Return only PlantUML source for a class diagram: Account has many Membership records, User has many Membership records, and Membership has role and joinedAt fields. I will render it in our existing PlantUML pipeline.
```

## Should Trigger

No

## Expected Behavior

- Do not activate for an explicit PlantUML-only deliverable.
- Produce or route to PlantUML source without creating an editable draw.io file.
- Do not introduce draw.io XML, validators, renderers, or icon-provider work.

## Deterministic Assertions

- contains: @startuml
- contains: @enduml
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
