# Changelog

## Unreleased

### Added

- Initial public Agent Skills repository scaffold.
- Validation, listing, and skill scaffolding scripts.
- Initial skill catalog for Codex operations, repo maintenance, skill maintenance, and productivity workflows.
- Project-local helper skill lockfile for upstream skills used while maintaining this repo.
- Added Oxc formatting/lint config files.
- Added lightweight ADR system with initial repository decision records.
- Added `adr-writer` for short repo-level Architecture Decision Records.
- Added ADR validation and ADR creation scripts.

### Changed

- Tightened skill validation so every `SKILL.md` must include the universal section contract from the spec.
- Kept the repository license as MIT because published upstream skills are installed project-locally instead of vendored.
- Aligned validation, docs, and publishing guidance with the open Agent Skills specification.

### Fixed

- Added missing universal skill sections and an explicit approval note for the memory backup script.

### Deprecated

### Removed

- Removed vendored copies of already-published upstream skills from the public `skills/` catalog.
