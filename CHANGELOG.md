# Changelog

## Unreleased

### Added

- Expanded `drawio-diagrams` theSVG lookup guidance with a German B2B AI / stark AI lookup pack for AI, automation, ERP/CRM, cloud, data, delivery, and security icon needs.

### Changed

### Fixed

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

### Deprecated

### Removed

## v0.4.3 - 2026-06-11

### Added

- Added ADRs for Architecture Compass starter guidance covering Bun/pnpm ownership, native TypeScript tooling, and Oxc lint/format defaults.
- Added a publishable spec for the Architecture Compass Oxc tooling policy.

### Changed

- Updated `architecture-compass` preferred stack guidance for Bun runtimes, pnpm workspace hardening, native TypeScript `tsgo` usage, Oxc linting/formatting defaults, and layered Oxc type-aware linting.

### Fixed

### Deprecated

### Removed

## v0.4.2 - 2026-06-10

### Added

### Changed

- Clarified the canonical `architecture-compass` bundled guardrail inventory for setup and new-repo runs.
- Expanded setup reporting so adapted guardrails record the active adapted rule alongside defer and reject evidence.

### Fixed

### Deprecated

### Removed

## v0.4.1 - 2026-06-10

### Added

### Changed

- Updated `architecture-compass` setup and new-repo guidance so bundled ADR guardrails remain visible as adopted, adapted, deferred, or rejected decisions instead of being silently dropped by target-repository evidence.
- Made `setup-report-template.md` the canonical setup output for bundled guardrail adoption decisions, with deferred and rejected guardrails carrying explicit follow-up context.

### Fixed

### Deprecated

### Removed

## v0.4.0 - 2026-06-09

### Added

- Promoted `architecture-compass` into the public Engineering Workflows catalog with setup and refactor modes for ADR-governed repositories.
- Added `skill-evals/architecture-compass` promotion proof.
