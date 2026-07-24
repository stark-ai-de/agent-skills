# ADR-0031: Use approved bounded fixed-theme browser rasterization

Status: Accepted
Date: 2026-07-24
Owner: stark-ai-de
Gist: Fixed-theme SVG previews use an approved, isolated local browser with fail-closed inspection.

## Decision

Fixed-theme SVGs use the bounded local browser helper after explicit approval to recursively validate embedded SVG image data, reject active or remote content, and publish no-clobber output.

## Why

- Direct draw.io PNG export lacks the required fixed dark-theme preview.
- Browser rendering can interpret active markup or external resources.
- Comparison galleries need deterministic dimensions and viewer-independent artifacts.

## Options

- Chosen: one explicitly selected local Chromium-family executable, isolated profile, disabled JavaScript, bounded recursion, and validated no-clobber output.
- Rejected: direct Desktop PNG theme claims; the Desktop theme option applies to SVG exports.
- Rejected: unrestricted browsers or remote raster services; they weaken approval and publication boundaries.

## Consequences

- Good: fixed-theme PNG proof remains portable and fail-closed.
- Tradeoff: a pinned local browser and explicit approval are required.
- Risk: browser differences still warrant encoded-output inspection.

## Follow-up

- Keep nested depth, aggregate-byte, and output limits in deterministic regressions.
