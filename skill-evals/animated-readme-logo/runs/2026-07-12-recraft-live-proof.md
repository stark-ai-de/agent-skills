# Approved Recraft live proof — 2026-07-12

## Candidate

- Catalog version: `0.9.0`
- Skill version: `0.2.0`
- Pre-proof candidate commit: `ebf89557e76d176a0d07e9727388438d4157527b`
- Skill-tree SHA-256: `c8d950d9d7fa78ef607a33fc04064b9f5c2c93671f4c298074e626679c5bb0a3`

## Approved batch

Live discovery confirmed `recraft_v4_1` with image output, no reference-media input, `1:1`, `1k`, and `utility_vector` support. The exact preflight observed `2.5` credits for this one-output batch on 2026-07-12. That value is run evidence, not a documented or reusable price.

```text
model: recraft_v4_1
model_type: utility_vector
resolution: 1k
aspect_ratio: 1:1
count: 1
background_color: null
```

The maintainer explicitly approved that exact batch after the preflight. One job was submitted, completed successfully without parameter adjustment, and was not retried.

## Public brief

Create a clean, text-free vector mark for Agent Skills: a compact compass assembled from four modular interlocking nodes, legible at small README sizes, using restrained indigo, cyan, and warm coral with transparent-background intent.

## Result

```text
Task mode: create
Source route: recraft_v4_1
Provider state: used
Approval state: approved
SVG readiness: ready
Export status: not-requested
```

The provider returned an SVG concept with four paths. Its raw file was treated as design input and correctly failed strict validation because it contained generator metadata and a non-allowlisted signature element. The local canonical SVG preserves every generated path geometry exactly while removing the signature, metadata, no-op transforms, and editor-style presentation attributes. It adds deterministic layer IDs, literal colors, accessible text, and transparent square-canvas sizing.

## Evidence

- Canonical SVG: `assets/2026-07-12-recraft-agent-skills-logo.svg`
- Motion specification: `assets/2026-07-12-recraft-agent-skills-logo-motion.md`
- Raw provider-result SHA-256: `8813006dd0addf12ef2403846754216450d74538a8417b70931e04facef9cd38`
- Canonical SVG SHA-256: `3feab74c65c7854d008fca395df25ba9cce964056ba6ca26ca9e40efbb29931a`
- Motion-spec SHA-256: `f64591965f5d20aaec3a811a33bf29255a62f539c639bbcdde3534949f2b2982`
- Geometry comparison: four raw paths, four canonical paths, all `d` attributes equal
- Strict validator: `VALID SVG`; canvas `1024 × 1024`; viewBox `0 0 2048 2048`
- Safety comparison: provider metadata removed and no external references present
- Visual inspection: transparent and readable on light, dark, and checkerboard backgrounds at `256 px` and `64 px`

No provider job ID, result URL, embedded signature, or temporary preview raster is published. No animated raster was requested or claimed; the deterministic motion specification remains the reproducible animation source.
