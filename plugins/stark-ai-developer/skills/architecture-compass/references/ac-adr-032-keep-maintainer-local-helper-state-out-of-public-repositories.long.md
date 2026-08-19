# AC-ADR-032: Keep Maintainer-Local Helper State Out of Public Repositories

ID: AC-ADR-032
Title: Keep Maintainer-Local Helper State Out of Public Repositories
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: repository-architecture
Tags: local-state, helpers, lockfiles, gitignore
Applies when: Installing or recording maintainer-local agent helpers, generated host links, or helper lock state.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep personal helper installations local unless the repository explicitly adopts them as shared dependencies.

Variants: [Short](ac-adr-032-keep-maintainer-local-helper-state-out-of-public-repositories.short.md) · **Long, canonical** · [Guide](ac-adr-032-keep-maintainer-local-helper-state-out-of-public-repositories.guide.md)

## Context

Maintainers often install helper skills, create host-specific links, and generate lock or cache state to support their own workflow. Tracking that state can imply an official team bundle, expose local paths, republish third-party content, or make a public repository depend on one maintainer's host. Broadly ignoring every agent-related path is also unsafe because repository-owned skills and binding instruction files may legitimately belong in version control.

## Decision

Maintainer-local helper installations, generated host links, caches, downloaded copies, and personal helper lock state stay outside tracked public repository content by default.

The repository defines narrow ignore rules from the actual installer destinations and generated files in use. Those rules do not hide repository-owned public skills, accepted agent instructions, checked-in host metadata, fixtures, or other intentional source. Third-party helper content is installed from its canonical public source or referenced in maintainer documentation; it is not vendored into the public skill catalog merely because maintainers use it.

A helper becomes shared repository state only through an explicit repository decision that identifies its canonical source and license, selected version or update policy, supported hosts and install target, security and side-effect review, ownership, reproducible install or bootstrap path, validation, and removal procedure. The repository records only the minimal source-backed configuration needed for that shared contract. Personal global installs remain local even when the same helper is recommended.

Before changing ignores, inspect tracked, untracked, ignored, staged, and generated state so an ignore rule does not conceal existing repository content or convert a private path into public documentation.

## Invariants

- Local state and repository-owned skill packages have distinct, inspectable boundaries.
- Ignore rules are narrow enough to preserve intentional agent instructions and public skills.
- Shared helper dependencies have explicit source, license, owner, version policy, and reproducibility.
- Third-party content is not republished without an independent authorization and provenance review.
- Local paths, usernames, and host-specific install state do not enter public examples.

## Failure handling

Stop a proposed commit or publication when helper provenance, license, generated status, or intended ownership is unclear. Preserve existing tracked state until the boundary is classified; do not solve ambiguity with a broad ignore rule or by deleting another maintainer's files.

## Consequences

The public repository reflects intentional source and team contracts rather than personal setup. Maintainers may need to reinstall helpers locally, and teams that deliberately share a helper must document and validate its lifecycle explicitly.
