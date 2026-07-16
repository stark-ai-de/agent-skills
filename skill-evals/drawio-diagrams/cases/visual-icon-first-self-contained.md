# Visual Icon-First Self-Contained Architecture

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Starting from the supplied icon architecture fixture, add the supplied original Orbit SVG as the icon for a labelled Orbit Rules Engine with stable ID `orbit-rules-engine`, create the uncompressed editable `icon-first-stack.drawio`, and export `icon-first-stack.svg`. Every primary component must keep a recognizable logo or labelled semantic icon, and both artifacts must work without runtime image URLs.
```

## Should Trigger

Yes

## Split Family

native-icon-architecture

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/architecture-icons.drawio
- skill-evals/drawio-diagrams/fixtures/eval-orbit-mark.svg

## Expected Behavior

- Preserve or improve the existing icon coverage instead of replacing marks with bare cards.
- Validate and embed the supplied Orbit SVG rather than linking to its fixture path at runtime.
- Keep image aspect ratios fixed and use a coherent neutral-chip treatment.
- Validate the uncompressed source for embedded, self-contained SVG images.
- Export and inspect the exact SVG, including every primary component label.

## Deterministic Assertions

- contains: icon-first-stack.drawio
- contains: icon-first-stack.svg
- contains: aspect=fixed
- contains: --require-self-contained-images

## Visual Assertions

- artifact_exists: icon-first-stack.drawio
- drawio_valid: icon-first-stack.drawio self_contained_svg=1 uncompressed=1
- drawio_embeds_svg_sha256: icon-first-stack.drawio 7a6f5242510a949786c36e67b9d85809851ddaf5b6e01982ae1df037c82a3d40 cell=orbit-rules-engine
- artifact_exists: icon-first-stack.svg
- drawio_self_contained_svg: icon-first-stack.drawio
- svg_valid: icon-first-stack.svg
- svg_self_contained_images: icon-first-stack.svg
- svg_contains: icon-first-stack.svg Client
- svg_contains: icon-first-stack.svg API Gateway
- svg_contains: icon-first-stack.svg Lambda
- svg_contains: icon-first-stack.svg PostgreSQL
- svg_contains: icon-first-stack.svg Redis
- svg_contains: icon-first-stack.svg Orbit Rules Engine
