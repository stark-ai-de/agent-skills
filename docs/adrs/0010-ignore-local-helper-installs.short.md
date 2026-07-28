# ADR-0010: Ignore local helper installs

ID: ADR-0010
Title: Ignore local helper installs
Status: Accepted
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: local-state, helpers, gitignore
Applies when: Installing or recording maintainer-local helper skills.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Local helper skills should not become repository state.

Variants: **Short** · [Long, canonical](0010-ignore-local-helper-installs.long.md) · [Guide](0010-ignore-local-helper-installs.guide.md)

## Decision

We will ignore `.agents/` and `skills-lock.json` so maintainer-local helper skills stay outside Git.

## Context

- Helper skills are local working aids, not catalog content.
- Tracking a helper lockfile can imply an official base skill set.

## Consequences

- Good: Public repo state stays focused on original skills and promotion proof.
- Tradeoff: Maintainers recreate helper installs locally.
- Risk: Local helper drift is less visible in review.
