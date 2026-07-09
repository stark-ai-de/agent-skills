# ER Diagram Crowded Labels

## Prompt

```text
Use $drawio-diagrams to create an editable ER diagram for User, Organization, Membership, Invoice, and Payment with relationship labels that do not overlap connectors.
```

## Should Trigger

Yes

## Expected Behavior

- Use entity boxes and relationship connectors appropriate for draw.io editing.
- Keep cardinality and relationship labels readable.
- Route connectors around text and labels.
- Validate geometry and report any routing warnings.

## Deterministic Assertions

- contains: relationship
- contains: labels
- contains: validate-drawio-diagram-rules.mjs
