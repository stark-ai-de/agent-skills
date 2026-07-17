# Graphviz DOT Source Negative

## Prompt

```text
Generate only Graphviz DOT source in a code block for this directed dependency graph: Web -> API, API -> Queue, Queue -> Worker, and Worker -> Database. Do not create any files or a diagrams.net diagram.
```

## Should Trigger

No

## Expected Behavior

- Do not activate because the requested output is explicitly Graphviz DOT.
- Return or route to DOT authoring and honor the explicit draw.io exclusion.
- Do not create `.drawio` XML or run draw.io-specific validation or export tooling.

## Deterministic Assertions

- contains: digraph
- contains: Web
- contains: Database
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
