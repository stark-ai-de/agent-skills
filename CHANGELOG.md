# Changelog

## Unreleased

### Added

- Initial public Agent Skills repository scaffold.
- Validation, listing, and skill scaffolding scripts.
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
