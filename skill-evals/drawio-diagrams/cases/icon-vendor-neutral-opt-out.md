# Vendor-Neutral Icon Opt Out

## Prompt

```text
Use $drawio-diagrams to create an editable cloud deployment diagram, but keep it vendor-neutral and do not show company branding. I still want components to be easy to recognize.
```

## Should Trigger

Yes

## Expected Behavior

- Honor the explicit non-branded mode without performing unnecessary logo lookups.
- Use relevant labelled semantic symbols for compute, queue, database, gateway, storage, and users.
- Keep the diagram icon-first instead of collapsing to bare text-only rectangles.
- Apply the same readability and validation gates as a branded architecture diagram.

## Deterministic Assertions

- contains: vendor-neutral
- regex: semantic icon|semantic symbol
- regex: no logo lookup|without.{0,}lookup
- contains: validate_drawio.py
