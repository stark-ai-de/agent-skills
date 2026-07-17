# Preserve Hidden Layers During An Edit

## Prompt

```text
Add an Audit Store to the Runtime page of the supplied draw.io fixture. Leave its second page and hidden Notes layer exactly as they are.
```

## Should Trigger

Yes

## Fixtures

- skill-evals/drawio-diagrams/fixtures/hidden-layer-two-page.drawio

## Expected Behavior

- Inspect every page and layer, including hidden content, before editing.
- Back up the source or write to a separate output path.
- Change only the requested Runtime page and layer while preserving unknown cells, stable IDs, page order, and hidden-layer state.
- Validate every page after the edit and report the preservation check.

## Deterministic Assertions

- contains: Notes layer
- contains: preserve
- regex: backup|separate output
- regex: every page|all pages
