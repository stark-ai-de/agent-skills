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

### Changed

- Updated public catalog, install examples, publishing docs, and generated site coverage for the `architecture-compass` promotion.

### Fixed

### Deprecated

### Removed

## v0.3.2 - 2026-05-29

### Added

### Changed

- Added user-facing `codegraph-ast-grep` use cases to the README, skill body, and usage playbook so the generated catalog explains everyday development workflows.

### Fixed

- Excluded local `.codegraph/` index state from the smoke-install clean copy so local CodeGraph sockets cannot break smoke validation.

### Deprecated

### Removed

## v0.3.1 - 2026-05-29

### Added

### Changed

- Updated `codegraph-ast-grep` setup guidance to present global vs repo-local install tradeoffs before approval, recommend global setup for personal multi-repo use, respect package-manager freshness and build-script policies, document pnpm ast-grep build approval, and keep `.codegraph/` index data ignored.

### Fixed

### Deprecated

### Removed

## v0.3.0 - 2026-05-29

### Added

- Promoted `codegraph-ast-grep` into the public Codex operations catalog with current CodeGraph, Codex MCP, ast-grep, and ast-grep MCP guidance.
- Added `skill-evals/codegraph-ast-grep` promotion proof.

### Changed

- Updated public catalog, install examples, and publishing docs for the `codegraph-ast-grep` promotion.

### Fixed

### Deprecated

### Removed

## v0.2.2 - 2026-05-26

### Added

- Added an Astro GitHub Pages catalog generated from public and incubator `SKILL.md` files.
- Added branded catalog assets, metadata, sitemap, JSON-LD, and generated skill detail pages.
- Added GitHub Pages deployment workflow and site build validation.

### Changed

- Extended repository validation to build and verify the generated site.

### Fixed

### Deprecated

### Removed

## v0.2.1 - 2026-05-26

### Added

- Added OpenAI/Codex metadata validation for Codex-facing public and incubator skills.
- Added `agents/openai.yaml` metadata for `codex-memory-curator` and incubator Codex operations skills.

### Changed

- Documented that Codex/OpenAI-facing skills use `agents/openai.yaml` while `SKILL.md` remains the portable source of truth.

### Fixed

### Deprecated

### Removed

## v0.2.0 - 2026-05-24

### Added

- Added `codex-memory-curator` as a promoted public Codex operations skill.

### Changed

- Updated `codex-spec-interviewer` to require user-verified finalization, convention-aware persisted spec/ADR artifacts, predictable spec filenames, and repo-facing documentation updates when artifact policy or promotion state changes.
- Documented the repository policy for implementation specs in `docs/specs/` and ADRs in `docs/adrs/`.
- Simplified release preparation so public skill changes carry skill version, package version, and changelog updates in the same pull request.
- Clarified that public skill `metadata.version` is independent from the repository package version.

### Fixed

- Fixed release validation so unchanged public skills can keep versions below the repository package release.

### Deprecated

### Removed

- Removed the separate `Prepare Release` workflow.

## v0.1.1 - 2026-05-24

### Added

- Added release-intent detection so pull requests that partially change `package.json`, `CHANGELOG.md`, or public skill `metadata.version` must pass release validation.
- Added GitHub Actions workflow linting to the local and CI validation gates.
- Added Cursor and VS Code actionlint recommendations and workspace settings for inline workflow diagnostics.

### Changed

- Renamed the public repository slug from `stark-ai-de/skills` to `stark-ai-de/agent-skills`.
- Kept `Publish Release` manual-only now that pull requests validate release intent before merge.

### Fixed

- Corrected `codex-spec-interviewer` release metadata to `0.1.1`.

### Deprecated

### Removed

## v0.1.0 - 2026-05-21

### Added

- Initial public Agent Skills repository scaffold.
- Validation, listing, and skill scaffolding scripts.
- Manual GitHub Actions workflows and helper scripts for preparing and publishing releases.
- Initial skill catalog for Codex operations, repo maintenance, skill maintenance, productivity, and engineering workflows.
- Added `codegraph-ast-grep` for Codex CLI setup and usage of CodeGraph paired with ast-grep.
- Added `codex-spec-interviewer` for turning fuzzy coding requests into Codex-ready implementation specs.
- Added incubator engineering workflow candidates for debugging, test-first implementation, issue slicing, PRDs, repo mapping, and prototype spikes.
- Added category README files, examples, out-of-scope boundary docs, and a root domain glossary.
- Added clean-copy install smoke test automation.
- Project-local helper skill lockfile for upstream skills used while maintaining this repo.
- Added Oxc formatting/lint config files.
- Added lightweight ADR system with initial repository decision records.
- Added `adr-writer` for short repo-level Architecture Decision Records.
- Added ADR validation and ADR creation scripts.
- Added `incubator/skills/` for candidate skills and `skill-evals/` for maintainer proof outside the runtime skill payload.

### Changed

- Tightened skill validation so every `SKILL.md` must include the universal section contract from the spec.
- Tightened category validation so category README files match skill frontmatter descriptions.
- Switched the repository license from MIT to Apache-2.0 for the public skill catalog and repository material.
- Aligned validation, docs, and publishing guidance with the open Agent Skills specification.
- Expanded `agent-context-bootstrap` into the canonical downstream repo setup workflow.
- Updated `codex-spec-interviewer` to use one-question-at-a-time grilling and a bounded source challenge before final specs.
- Added an ADR gate to `codex-spec-interviewer` so durable architectural decisions are drafted or linked before implementation specs.
- Moved broad engineering workflow candidates and `grill-plan` out of the public catalog and into the incubator.

### Fixed

- Added missing universal skill sections and an explicit approval note for the memory backup script.

### Deprecated

### Removed

- Removed vendored copies of already-published upstream skills from the public `skills/` catalog.
