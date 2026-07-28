# ADR-0027: Reuse logo export mechanics and gate tool installs

ID: ADR-0027
Title: Reuse logo export mechanics and gate tool installs
Status: Accepted
Date: 2026-07-13
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: logo, export, tool-install, approval
Applies when: Changing logo export tooling, recipes, or browser fallback behavior.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep export mechanics portable, recipes repository-owned, and every missing-tool installation approval-gated.

Variants: **Short** · [Long, canonical](0027-gate-logo-tool-installs-and-browser-fallbacks.long.md) · [Guide](0027-gate-logo-tool-installs-and-browser-fallbacks.guide.md)

## Decision

Ship one dependency-free Node exporter in `animated-readme-logo`. It consumes a trusted, root-bounded repository recipe, uses `librsvg` and headless FFmpeg, validates staged outputs before replacement, and reuses the bundled inspector. Brand behavior stays in the target repository. Missing tool installations require explicit approval; browser preview reuses configured browsers first.

## Context

- Duplicated product-level export plumbing drifts.
- SVG readiness does not prove raster-export readiness.

## Consequences

- Good: repositories share deterministic mechanics without sharing identity recipes.
- Tradeoff: recipes are trusted executable code; `--check` cannot sandbox them.
- Tradeoff: export pauses while tool approval is pending.
- Risk: package names vary; inspect the active package manager before proposing commands.
