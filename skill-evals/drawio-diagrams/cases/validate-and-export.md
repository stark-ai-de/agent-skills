# Validate And Export

Prompt:

```text
Use $drawio-diagrams to validate this .drawio file and export PNG and dark SVG if the local draw.io CLI is available.
```

Expected: activate. The skill should run `scripts/validate_drawio.py`, fix or report errors, run `scripts/render-drawio.mjs` only when draw.io Desktop CLI exists, inspect exported visuals when available, and clearly report skipped export reasons.
