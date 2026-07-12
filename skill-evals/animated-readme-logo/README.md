# animated-readme-logo Eval Proof

This folder contains self-contained routing and safety cases for `animated-readme-logo` v0.2.0 and its v0.9.0 promotion candidate.

## What the set proves

- Correct activation for README logo review, creation, faithful transformation, and animation/export.
- Recraft eligibility only for new or intentionally redesigned marks without reference-media requirements.
- Live capability, exact model, and current-cost discovery before a sanitized approval checkpoint.
- No credit-consuming call while approval is pending, declined, unavailable, indeterminate, or not required.
- Equivalent direct local SVG fallback and optional draw.io assistance only when materially useful.
- Strict SVG readiness, deterministic motion, capability-gated export, and honest status reporting.
- Root-bounded README audits that reject absolute, UNC, traversal, and symlink escapes.
- One portable workflow without agent-specific commands or forks.

## Cases

Creation and provider routing:

- `cases/no-initial-asset.md`
- `cases/provider-preflight-approval-gate.md`
- `cases/provider-declined-local-fallback.md`
- `cases/provider-unavailable-local-fallback.md`
- `cases/provider-cost-indeterminate-fallback.md`
- `cases/expressive-mark-style.md`

Existing assets, review, and transformation:

- `cases/static-svg-logo.md`
- `cases/animated-gif-only.md`
- `cases/raster-source-transform.md`
- `cases/transparent-logo-requirement.md`
- `cases/lottie-readme-request.md`

Capability, portability, and safety:

- `cases/export-capability-unavailable.md`
- `cases/readme-path-safety.md`
- `cases/portable-agent-host.md`

Negative activation:

- `cases/ordinary-readme-edit-negative.md`
- `cases/app-animation-negative.md`

Use `rubric.md` to grade outputs. Positive runs must emit all six public status fields. Automated evals must not make a paid provider call; the approved live Recraft batch is a separate maintainer-gated release proof.

The v0.9.0 eval schema intentionally adds no GIF, APNG, or WebP visual-assertion prefixes. Animated-format behavior is covered by deterministic fixture tests for the focused inspector.

## Release proofs

- [`runs/2026-07-12-forced-local-proof.md`](runs/2026-07-12-forced-local-proof.md)
- [`runs/2026-07-12-recraft-live-proof.md`](runs/2026-07-12-recraft-live-proof.md)
