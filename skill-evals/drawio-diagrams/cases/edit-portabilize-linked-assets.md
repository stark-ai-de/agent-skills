# Portabilize Linked Diagram Assets

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Make the supplied architecture fixture self-contained for offline distribution. Replace its unreachable fictional product artwork with the supplied approved Orbit SVG substitute, preserve the ordinary documentation hyperlink, save the uncompressed source as `portable-linked-assets.drawio`, and export `portable-linked-assets.svg`.
```

## Should Trigger

Yes

## Fixtures

- skill-evals/drawio-diagrams/fixtures/linked-assets-before.drawio
- skill-evals/drawio-diagrams/fixtures/eval-orbit-mark.svg

## Expected Behavior

- Distinguish image-runtime dependencies from legitimate user navigation links.
- Validate and embed the supplied Orbit artwork as data while preserving fixed aspect ratios.
- Preserve the ordinary documentation hyperlink and remove active or remote image loading.
- Run self-containment validation and report providers and substitutions once.

## Deterministic Assertions

- contains: self-contained
- contains: portable-linked-assets.drawio
- contains: portable-linked-assets.svg
- contains: hyperlink
- contains: aspect=fixed

## Visual Assertions

- artifact_exists: portable-linked-assets.drawio
- drawio_valid: portable-linked-assets.drawio self_contained_svg=1 uncompressed=1
- drawio_embeds_svg_sha256: portable-linked-assets.drawio 7a6f5242510a949786c36e67b9d85809851ddaf5b6e01982ae1df037c82a3d40 cell=remote-logo
- drawio_graph: portable-linked-assets.drawio links=https://docs.example.invalid/product
- artifact_exists: portable-linked-assets.svg
- svg_valid: portable-linked-assets.svg
- svg_self_contained_images: portable-linked-assets.svg
- svg_contains: portable-linked-assets.svg Example Product
- svg_contains: portable-linked-assets.svg Product documentation
