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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Use the open Agent Skills specification as the portable package and discovery contract.

Variants: **Short** · [Long, canonical](ac-adr-027-use-the-open-agent-skills-specification.long.md) · [Guide](ac-adr-027-use-the-open-agent-skills-specification.guide.md)

## Decision summary

A public skill repository uses the open Agent Skills specification as its package and discovery contract. Every published skill has a conforming `SKILL.md`, required frontmatter, a matching directory name, and only specification-supported resource directories. Host-specific metadata may extend that portable contract but cannot replace or contradict it.

## Context

One interoperable package shape lets skill hosts and installers discover the same public capability without a repository-specific format.

## Invariants

- `SKILL.md` remains the portable authority for skill identity and activation.
- Host extensions are additive and capability-gated.
- Repository validation checks the current specification rather than undocumented conventions.

## Consequences

Skills remain installable across compatible hosts, while maintainers must track specification changes and validate optional extensions separately.
