# Changelog

## Unreleased

### Added

### Changed

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
- Initial skill catalog for Codex operations, repo maintenance, skill maintenance, and productivity workflows.
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
