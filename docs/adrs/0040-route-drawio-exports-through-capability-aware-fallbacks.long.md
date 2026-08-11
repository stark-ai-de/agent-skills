# ADR-0040: Route draw.io exports through capability-aware fallback routing

ID: ADR-0040
Title: Route draw.io exports through capability-aware fallback routing
Status: Accepted
Date: 2026-08-10
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: drawio, exports, capability, fallback, receipts, approval
Applies when: Selecting draw.io authoring, rendering, export, browser, or fallback routes.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-10
Gist: Draw.io work starts with capability preflight, uses an explicit fallback ladder, and reports route limitations in a complete delivery receipt.

Variants: [Short](0040-route-drawio-exports-through-capability-aware-fallbacks.short.md) · **Long, canonical** · [Guide](0040-route-drawio-exports-through-capability-aware-fallbacks.guide.md)

## Decision

We will route every `drawio-diagrams` `create`, `edit-repair`, and `export` request through a non-mutating capability preflight after workflow and authority selection, while keeping `review` strictly read-only. The preflight selects the first evidenced route in this order: `transactional-native` with a Linux-native draw.io CLI; `approved-raw-cli-manual`, including an explicitly approved WSL Windows bridge; `fixed-theme-browser-raster` for validated fixed-theme SVG-to-PNG previews; `browser-url-preview` or `html-viewer-preview` only when explicitly requested; or `direct-xml` as the universal editable route. Image generation is not a diagram fallback and may be used only when the user explicitly changes the requested outcome. Tool installation, cross-boundary execution, browser use, hosted/MCP transfer, cache creation, and paid/provider actions each require separate approval. Native artifacts keep canonical names; fallback artifacts use explicit route suffixes and every receipt reports Capability status, Renderer route, Tool-install approval, Cross-boundary approval, Export status, Visual verification, Evidence scope, and Fallback (used/offered), including route limitations. This decision complements accepted ADR-0027 and ADR-0031 and does not alter their approval or fixed-theme rasterization contracts.

## Why

- Draw.io creation, editing, review, and export can have different local capabilities and side-effect boundaries.
- A successful raw CLI, Windows bridge, browser preview, or local rasterization does not provide the same evidence as the transactional native renderer.
- Users need an editable source and an honest account of which renderer, approvals, and visual evidence were actually available.
- Keeping direct XML available prevents optional-tool detection from blocking delivery of an editable source.

## Options

- Chosen: Run the capability preflight after workflow and authority selection, prefer the transactional-native route, and descend through explicitly named raw, fixed-theme-browser, browser-preview, or direct-XML routes with independent approvals and receipt limits.
- Rejected: Silently install a renderer or cross the WSL/Windows boundary, because capability discovery is not user authorization.
- Rejected: Treat a raw CLI, browser preview, or generated image as a native editable/export result, because their evidence and artifact contracts differ.
- Rejected: Make image generation a fallback for draw.io, because it changes the requested editable outcome.

## Consequences

- Good: Route choice, approval boundaries, artifact naming, and evidence limits remain visible and reproducible.
- Good: NixOS/WSL users get a native Linux path without mutable configuration or unsupported self-contained bundles, while an explicitly approved Windows bridge remains available as a labeled fallback.
- Tradeoff: A preflight and receipt add a small amount of reporting to every mutating or export task.
- Risk: Capability detection or route labels can drift; focused documentation and validation must keep the ladder synchronized.

## Follow-up

- Keep `SKILL.md`, `references/delivery.md`, `references/toolset-setup.md`, `agents/openai.yaml`, and the public release spec aligned with the route names and receipt fields.
- Keep accepted ADR-0027 and ADR-0031 authoritative for installation approval and fixed-theme browser isolation; use a successor ADR if either contract must change.
