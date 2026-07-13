# ADR-0026: Gate logo tool installs and browser fallbacks

Status: Accepted
Date: 2026-07-13
Owner: stark-ai-de
Gist: Ask before installing the smallest missing logo toolset and reuse configured browsers before downloading another one.

## Decision

We will make `animated-readme-logo` request explicit approval for the smallest missing exporter or browser installation, prefer `librsvg` plus headless FFmpeg for raster delivery, and exhaust configured Chrome or Chromium paths and `agent-browser` before offering a Chrome-for-Testing download.

## Why

- A validated SVG and motion plan do not prove that requested raster files can be built.
- Silent package installation violates the existing side-effect boundary.
- Browser preview and export are separate capabilities.
- Reusing a managed browser avoids duplicate downloads and platform-specific executable assumptions.

## Options

- Chosen: capability preflight, itemized approval, minimal install, verification, and fallback ladder.
- Rejected: automatic installation, because it changes local state without consent.
- Rejected: Playwright-only preview, because its bundled browser may be absent while another compatible browser exists.

## Consequences

- Good: missing tools become an actionable checkpoint instead of an ambiguous blocker.
- Tradeoff: export pauses while approval is pending.
- Risk: package names vary; inspect the active package manager before proposing commands.

## Follow-up

- Keep provider approval and local-tool installation approval distinct in reports.
