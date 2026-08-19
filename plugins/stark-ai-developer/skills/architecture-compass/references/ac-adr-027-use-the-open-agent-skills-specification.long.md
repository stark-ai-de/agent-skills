# AC-ADR-027: Use the Open Agent Skills Specification

ID: AC-ADR-027
Title: Use the Open Agent Skills Specification
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: agent-skills, specification, portability
Applies when: Creating, validating, or publishing a repository of public Agent Skills.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Use the open Agent Skills specification as the portable package and discovery contract.

Variants: [Short](ac-adr-027-use-the-open-agent-skills-specification.short.md) · **Long, canonical** · [Guide](ac-adr-027-use-the-open-agent-skills-specification.guide.md)

## Context

Public skills need a package shape that agents, installers, reviewers, and repository validators can recognize without private conventions. A host-specific manifest can improve one product experience, but making it the only authority prevents other compatible hosts from discovering or understanding the skill. A custom format also creates unnecessary migration and validation ownership.

## Decision

A public skill repository uses the open Agent Skills specification as its normative package and discovery contract.

Every published skill has a `SKILL.md` whose required frontmatter, name, description, directory identity, and optional resource layout conform to the current specification. Skill names and folder names match. Instructions use progressive disclosure: the main file contains the operational workflow and routes longer examples, references, assets, and scripts through supported directories only.

Host-specific manifests or metadata may extend a conforming skill when a named host benefits from them. They remain additive, are validated against that host's current contract, and do not replace, weaken, or contradict `SKILL.md`. A repository-specific catalog, site, or installer index is derived from conforming skills rather than becoming an alternative skill definition.

The repository validates required metadata, naming, supported paths, links, public-safety constraints, and install discovery against the specification and its actual publication tooling. Undocumented installer behavior is not treated as a durable contract.

## Invariants

- A public skill remains understandable from its conforming `SKILL.md` without a host-specific manifest.
- Host extensions cannot redefine the portable name, trigger, or safety boundary silently.
- Generated catalogs and sites derive identity from the skill package.
- Specification or installer changes are re-verified before release-facing claims.

## Failure handling

Do not publish or promote a skill whose required metadata, name, folder, supported resource layout, or discovery behavior is invalid. If a host extension conflicts with the portable package, preserve the portable contract and stop the affected host publication until the extension is repaired or the repository accepts a new explicit compatibility decision.

## Consequences

Public skills share a portable baseline and can be validated consistently across repositories. Maintainers still own compatibility checks for optional host metadata and must update guidance when the specification or installers evolve.
