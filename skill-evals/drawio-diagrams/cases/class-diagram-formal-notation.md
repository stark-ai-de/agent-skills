# Formal UML Class Diagram

## Prompt

```text
Use $drawio-diagrams to create an editable domain model for Account, User, Organization, Membership, Invoice, and Payment, including interfaces, inheritance, composition, and multiplicities.
```

## Should Trigger

Yes

## Expected Behavior

- Use recognizable UML class compartments and formal relationship notation.
- Preserve inheritance, composition, interface, and multiplicity semantics precisely.
- Keep connectors and labels readable without decorative product logos that weaken the formal notation.
- Validate the editable XML and inspect the completed class layout.

## Deterministic Assertions

- contains: multiplicity
- regex: inheritance|generalization
- contains: composition
- contains: validate_drawio.py
