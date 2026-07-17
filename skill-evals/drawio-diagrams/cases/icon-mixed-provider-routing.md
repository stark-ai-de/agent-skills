# Mixed Icon Provider Routing

## Prompt

```text
Use $drawio-diagrams to create a self-contained editable architecture diagram containing Claude, GitHub Actions, AWS Lambda, PostgreSQL, and an unnamed internal rules engine. Read-only network access is available.
```

## Should Trigger

Yes

## Expected Behavior

- Route AI-product artwork to Lobe Icons, AWS Lambda to the native draw.io stencil, and broad technology brands to a suitable selected SVG source such as Simple Icons.
- Use a labelled semantic icon for the unnamed internal engine.
- Embed selected SVGs instead of keeping provider URLs in the diagram.
- Avoid bulk packs or persistent caches and record providers and any substitutions once.

## Deterministic Assertions

- contains: Lobe Icons
- regex: Simple Icons|SimpleIcons
- contains: native draw.io
- contains: semantic icon
