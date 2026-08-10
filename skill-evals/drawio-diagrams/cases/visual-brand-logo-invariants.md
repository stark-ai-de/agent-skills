# Visual Brand Logo Invariants

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Starting from the supplied offline icon fixture and original Orbit SVG, create an uncompressed self-contained `brand-logo-invariants.drawio`. Keep stable component IDs `postgres`, `orbit-rules-engine`, and `custom-ledger`. Preserve the PostgreSQL and Orbit logo bytes and original colors exactly, and give only the unresolved Custom Ledger node a labelled semantic fallback; do not recolor or replace either resolved peer.
```

## Should Trigger

Yes

## Split Family

native-icon-architecture

## Fixtures

- skill-evals/drawio-diagrams/fixtures/offline-icon-before.drawio
- skill-evals/drawio-diagrams/fixtures/eval-orbit-mark.svg

## Expected Behavior

- Preserve the resolved PostgreSQL and Orbit SVG payloads byte-for-byte, including their original brand colors, viewBoxes, and fixed aspect ratios.
- Keep `custom-ledger` as a labelled semantic fallback only; its unresolved status must not alter either resolved peer logo.
- Validate the uncompressed, self-contained editable source and report any per-node fallback without claiming that the fallback is an official logo.

## Deterministic Assertions

- contains: brand-logo-invariants.drawio
- contains: custom-ledger
- regex: original.{0,}(colors|bytes)|preserve.{0,}(colors|bytes)
- regex: semantic.{0,}fallback
- regex: resolved.{0,}(peer|logo)|without.{0,}(recolor|replace)
- contains: --require-self-contained-images

## Visual Assertions

- artifact_exists: brand-logo-invariants.drawio
- drawio_valid: brand-logo-invariants.drawio self_contained_svg=1 uncompressed=1
- drawio_embeds_svg_sha256: brand-logo-invariants.drawio 4d0abd8d1835c357829c0d0ea2e25f106f57d8735d861aa7ced10df825e3c55a cell=postgres
- drawio_embeds_svg_sha256: brand-logo-invariants.drawio 7a6f5242510a949786c36e67b9d85809851ddaf5b6e01982ae1df037c82a3d40 cell=orbit-rules-engine
- drawio_graph: brand-logo-invariants.drawio component_ids=postgres,orbit-rules-engine,custom-ledger component_labels=postgres:PostgreSQL,orbit-rules-engine:Orbit%20Rules%20Engine,custom-ledger:Custom%20Ledger exact_components=1
