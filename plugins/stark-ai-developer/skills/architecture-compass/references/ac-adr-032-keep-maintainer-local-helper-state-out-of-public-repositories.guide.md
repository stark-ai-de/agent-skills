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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep personal helper installations local unless the repository explicitly adopts them as shared dependencies.

Variants: [Short](ac-adr-032-keep-maintainer-local-helper-state-out-of-public-repositories.short.md) · [Long, canonical](ac-adr-032-keep-maintainer-local-helper-state-out-of-public-repositories.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls local-state ownership.

## Boundary inventory

Before editing ignore rules, classify each relevant path as repository-owned source, repository-owned generated output, shared dependency state, or maintainer-local install. Inspect the installer's actual project and global destinations and verify whether it creates copies, symlinks, manifests, or lockfiles.

Avoid copying a repository-specific ignore list blindly. For example, `.agents/` can be maintainer-local in one repository and a deliberate portable skill root in another. Ignore the narrow generated boundary that the target repository actually owns.

## Shared-helper checklist

- canonical public source and license;
- selected skill and host targets;
- explicit user or maintainer approval before installation;
- version/update and supply-chain review policy;
- reproducible bootstrap and validation;
- owner, cleanup, and replacement procedure.

## Decision lineage

- `generalizes`: [ADR-0010](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0010-ignore-local-helper-installs.long.md).

## Current references

- [Git ignore documentation](https://git-scm.com/docs/gitignore)
- [Open skills CLI installation scopes](https://github.com/vercel-labs/skills)

## Revisit

Create a successor if helper installations become an intentional versioned team dependency class. Update exact installer paths in local documentation, not in this portable decision.
