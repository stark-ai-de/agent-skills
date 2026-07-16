# Animate Flow But Not Structure

## Prompt

```text
Use $drawio-diagrams to create an editable architecture diagram showing API requests, a queued event, a database write, team ownership, a trust boundary, and a legend.
```

## Should Trigger

Yes

## Split Family

animation-role-separation

## Expected Behavior

- Animate request, event, and data-flow edges by default.
- Keep ownership, containment, trust-boundary, legend, dependency, and annotation relationships static.
- Assign explicit edge roles so validation can distinguish flow from structure.
- Ensure arrowheads, labels, and protocols keep the diagram complete without motion.

## Deterministic Assertions

- contains: flowAnimation=1
- regex: ownership.*static|static.*ownership
- contains: dataRole
- regex: arrowhead|arrowheads
