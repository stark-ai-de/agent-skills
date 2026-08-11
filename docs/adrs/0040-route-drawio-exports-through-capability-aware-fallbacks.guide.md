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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-10
Gist: Draw.io work starts with capability preflight, uses an explicit fallback ladder, and reports route limitations in a complete delivery receipt.

Variants: [Short](0040-route-drawio-exports-through-capability-aware-fallbacks.short.md) · [Long, canonical](0040-route-drawio-exports-through-capability-aware-fallbacks.long.md) · **Guide**

This guide is non-normative. [Long](0040-route-drawio-exports-through-capability-aware-fallbacks.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- After selecting `create`, `edit-repair`, or `export` and confirming authority, run a non-mutating capability preflight. Record available tools, required approvals, candidate route, expected artifacts, and evidence limits before reading, authoring, rendering, or exporting. Keep `review` strictly read-only.
- Prefer `transactional-native` with a Linux-native draw.io executable and `scripts/render-drawio.mjs`.
- If unavailable, use `approved-raw-cli-manual` only after the relevant tool-install approval and format smoke test. A cross-boundary Windows bridge (for example, from WSL) additionally requires cross-boundary approval, path conversion with the host's path-conversion utility, an explicit `.windows-bridge` suffix, and a statement that transactional staging/no-clobber guarantees are unavailable.
- Use `fixed-theme-browser-raster` only for validated fixed-theme SVG-to-PNG previews and only with the separate browser approval required by ADR-0031. Use `browser-url-preview` or `html-viewer-preview` only when explicitly requested; it is preview transport, not a canonical editable artifact.
- Use `direct-xml` whenever optional tooling is unavailable or declined. Do not silently switch to image generation; that route requires an explicit changed outcome and is not editable draw.io.
- Keep native artifact names canonical. Add a route suffix to fallback outputs and do not overwrite a native artifact with a fallback under the native name.
- Keep installation, cross-boundary, browser, hosted/MCP, cache, and paid/provider approvals distinct. No approval is transitive.

## Verification

- Confirm the receipt contains exactly these semantic fields: `Capability status`, `Renderer route`, `Tool-install approval`, `Cross-boundary approval`, `Export status`, `Visual verification`, `Evidence scope`, and `Fallback (used/offered)`.
- Confirm fallback limitations are stated, especially the missing transactional guarantees for raw/manual/Windows routes and the non-canonical/data-exposure limits of browser URL/HTML previews.
- Confirm Linux-host native setup checked active user-profile ownership and package compatibility before a separately approved native package installation; mutable configuration and AppImage installation are not used.
- Run the focused draw.io validators appropriate to the changed artifact. Keep local, CI, publication, hosted, deployment, and live-runtime claims separate.

## Current references

- `skills/engineering-workflows/drawio-diagrams/SKILL.md`
- `skills/engineering-workflows/drawio-diagrams/references/delivery.md`
- `skills/engineering-workflows/drawio-diagrams/references/toolset-setup.md`
- Accepted [ADR-0027](0027-gate-logo-tool-installs-and-browser-fallbacks.short.md) for independent installation approval.
- Accepted [ADR-0031](0031-use-approved-bounded-fixed-theme-rasterization.short.md) for fixed-theme browser isolation and approval.

## Revisit

Create a new ADR that supersedes this record when the route ladder, approval boundaries, canonical naming, or receipt contract changes. Update all three variants and both sides of the supersession metadata in one change.
