# ADR-0027: Reuse logo export mechanics and gate tool installs

Status: Accepted
Date: 2026-07-13
Owner: stark-ai-de
Gist: Keep export mechanics portable, recipes repository-owned, and every missing-tool installation approval-gated.

## Decision

Ship one dependency-free Node exporter in `animated-readme-logo`. It consumes a trusted, root-bounded repository recipe, uses `librsvg` and headless FFmpeg, validates staged outputs before replacement, and reuses the bundled inspector. Brand behavior stays in the target repository. Missing tool installations require explicit approval; browser preview reuses configured browsers first.

## Why

- Duplicated product-level export plumbing drifts.
- SVG readiness does not prove raster-export readiness.
- Silent installation violates the side-effect boundary.

## Options

- Rejected: moving complete product generators into the skill, because brand behavior is not reusable.
- Rejected: automatic installation, because it changes local state without consent.

## Consequences

- Good: repositories share deterministic mechanics without sharing identity recipes.
- Tradeoff: recipes are trusted executable code; `--check` cannot sandbox them.
- Tradeoff: export pauses while tool approval is pending.
- Risk: package names vary; inspect the active package manager before proposing commands.

## Follow-up

- Keep provider approval and local-tool installation approval distinct in reports.
- Add formats only when their deterministic encoding and inspection contracts are tested.
