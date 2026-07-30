# ADR-0031: Use approved bounded fixed-theme browser rasterization

ID: ADR-0031
Title: Use approved bounded fixed-theme browser rasterization
Status: Accepted
Date: 2026-07-24
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: browser, rasterization, isolation
Applies when: Rendering a fixed-theme SVG preview through a local browser.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Fixed-theme SVG previews use an approved, isolated local browser with fail-closed inspection.

Variants: **Short** · [Long, canonical](0031-use-approved-bounded-fixed-theme-rasterization.long.md) · [Guide](0031-use-approved-bounded-fixed-theme-rasterization.guide.md)

## Decision

Fixed-theme SVGs use the bounded local browser helper after explicit approval to recursively validate embedded SVG image data, reject active or remote content, and publish no-clobber output.

## Context

- Direct draw.io PNG export lacks the required fixed dark-theme preview.
- Browser rendering can interpret active markup or external resources.

## Consequences

- Good: fixed-theme PNG proof remains portable and fail-closed.
- Tradeoff: a pinned local browser and explicit approval are required.
- Risk: browser differences still warrant encoded-output inspection.
