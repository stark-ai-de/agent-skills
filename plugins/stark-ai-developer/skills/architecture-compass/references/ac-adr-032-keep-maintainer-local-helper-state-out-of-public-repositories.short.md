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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep personal helper installations local unless the repository explicitly adopts them as shared dependencies.

Variants: **Short** · [Long, canonical](ac-adr-032-keep-maintainer-local-helper-state-out-of-public-repositories.long.md) · [Guide](ac-adr-032-keep-maintainer-local-helper-state-out-of-public-repositories.guide.md)

## Decision summary

Maintainer-local helper skill installations, generated host links, caches, and personal helper lock state stay outside tracked public repository content by default. A helper becomes shared repository state only through an explicit decision that names its source, versioning, install target, security review, ownership, and reproducible team workflow; original repository-owned skills and agent instructions remain tracked in their canonical locations.

## Context

Local productivity aids can otherwise look like an official base bundle or accidentally republish third-party skill content.

## Invariants

- Ignore rules distinguish local installs from repository-owned public skills and instructions.
- Third-party helpers are referenced or installed, not silently vendored.
- A shared helper dependency has explicit ownership and reproducibility.

## Consequences

Public state remains intentional and provenance-safe, while maintainers recreate personal helpers unless the team deliberately adopts them.
