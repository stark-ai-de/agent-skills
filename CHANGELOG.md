# Changelog

## Unreleased

### Added

- Added `drawio-diagrams` architecture readability guidance for connector-label gutters, fan-out lanes, package/detail row treatment, component-card hierarchy, whitespace balancing, and icon-chip consistency.
- Added a `drawio-diagrams` architecture readability eval case and rubric criteria for dense architecture diagrams and logo fidelity.

### Changed

- Expanded `drawio-diagrams` XML authoring, routing, theming, icon, and verification references to keep labels off section borders, separate worker/outbound routes, preserve real logo artwork, and distinguish component titles from metadata.

### Fixed

- Added a `drawio-diagrams` diagram-rule warning for dense edge labels that lack a readable label background.

### Deprecated

### Removed

## v0.6.2 - 2026-07-08

### Added

### Changed

### Fixed

- Fixed `drawio-diagrams` route-crossing validation so transparent text boxes and callouts are still treated as connector obstacles.
- Added regression coverage for connectors crossing transparent `fillColor=none` callouts.

### Deprecated

### Removed

## v0.6.1 - 2026-07-07

### Added

- Added strict XML preflight and browser URL helper coverage to the public `drawio-diagrams` skill.
- Added `drawio-diagrams` rules for real-logo defaults, icon source cascades, connector routing, fixed-aspect logos, and simplified/detailed diagram views.
- Added business AI workflow lookup terms to the `drawio-diagrams` icon catalog for AI, automation, ERP/CRM, cloud, data, delivery, and security icon needs.

### Changed

- Expanded `drawio-diagrams` setup, delivery, verification, and icon-catalog guidance with concrete commands and curated style starters.
- Updated `drawio-diagrams` to ask for missing-logo fetch approval during initial setup and to use simplified icons consistently when approval or sources are unavailable.

### Fixed

- Hardened `drawio-diagrams` regression coverage for forbidden XML constructs, icon catalog smoke checks, and browser URL generation.
- Added diagram-rule regression coverage for floating semantic edges and distorted image/logo cells.

### Deprecated

### Removed

## v0.6.0 - 2026-07-07

### Added

- Promoted `drawio-diagrams` into the public Engineering Workflows catalog for creating, editing, validating, and exporting editable draw.io / diagrams.net `.drawio` diagrams.
- Added the `drawio-diagrams` runtime payload with concise workflow guidance, XML authoring references, diagram-type and theming playbooks, delivery guidance, public-safe examples, and OpenAI metadata.
- Added deterministic draw.io validation for multi-page files, root/layer structure, attached vertex and edge geometry, dimensions, contrast, font-size, overlap, containment, icon, and edge-reference checks.
- Added optional local helpers for draw.io Desktop export and explicitly approved local shape/icon-cache search.
- Added `drawio-diagrams` eval proof, promotion cases, rubric, and a public release spec.
- Added ADR-0022 to allow dependency-free Python helpers by exception for complex deterministic public-skill validation.

### Changed

- Updated public catalog docs, Engineering Workflows listings, install guidance, publishing docs, package metadata, and generated site coverage for the `drawio-diagrams` promotion.
- Extended repository validation with draw.io examples and validator scenarios.

### Fixed

### Deprecated

### Removed

## v0.5.0 - 2026-07-06

### Added

- Added the promoted `cursor-spec-interviewer` public skill under Cursor Operations with self-contained templates, references, Cursor execution prompt asset, and eval proof.
- Added the promoted `cursor-memory-curator` public skill under Cursor Operations with Cursor-native context inventory, redacted risk scanning, approval-gated backup, cleanup templates, references, and eval proof.
- Added the promoted `claude-memory-curator` public skill under Claude Operations with Claude Code context inventory, redacted risk scanning, approval-gated backup, cleanup templates, references, and eval proof.
- Added the promoted `claude-spec-interviewer` public skill under Claude Operations with Claude Code-native source challenge, ADR gate, persistence guidance, execution prompt asset, templates, references, and eval proof.
- Added ADR-0021 to keep portable public skills in workflow categories and reserve runtime operations categories for runtime-specific behavior.
- Added Cursor global and project-local install examples for `cursor-spec-interviewer` and `cursor-memory-curator`.
- Added Claude Code project-local and user-level install guidance for `claude-spec-interviewer` and `claude-memory-curator`.

### Changed

- Moved `codegraph-ast-grep` to Engineering Workflows and updated its setup wording with runtime-specific MCP boundaries while keeping Codex MCP configuration clearly Codex-only.
- Clarified that `codex-memory-curator` remains scoped to Codex memory state even when installed from Cursor.
- Updated public catalog docs and package metadata for Cursor Operations and Claude Operations.
- Tightened Claude skill descriptions so trigger keywords are front-loaded and resilient to Claude Code skill-list truncation.
- Revised `codex-spec-interviewer` 0.2.0 with a deduplicated payload, clearer Codex integration boundaries, private-spec destination guidance, and refocused rollout guidance.

### Fixed

- Fixed `codex-spec-interviewer` artifact-destination guidance so private, exploratory, sensitive, or not-yet-public specs stay under the ignored `docs/specs/do-not-publish/` structure unless the maintainer explicitly confirms a publishable `docs/specs/` destination.
- Fixed spec-interviewer eval proof so explicit no-file persistence declines are exempt from persisted-path checks.
- Removed stale Cursor proof text that still listed the Codex spec-interviewer payload cleanup as a pending follow-up.
- Fixed `claude-memory-curator` inventory and risk scanning so explicit Claude auto-memory directories do not cause repo instruction files to be classified as auto-memory topics.
