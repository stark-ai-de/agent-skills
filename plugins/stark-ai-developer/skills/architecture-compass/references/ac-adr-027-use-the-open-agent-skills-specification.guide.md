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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Use the open Agent Skills specification as the portable package and discovery contract.

Variants: [Short](ac-adr-027-use-the-open-agent-skills-specification.short.md) · [Long, canonical](ac-adr-027-use-the-open-agent-skills-specification.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls the package contract.

## Adoption checklist

- Give each skill a lowercase hyphenated folder matching its frontmatter `name`.
- Put the activation boundary in `description`; keep operational instructions concise and route depth through supported resource folders.
- Validate every public skill from a clean copy and through the intended installer before promotion.
- Treat host-specific metadata as a separately tested extension, not required boilerplate for unrelated hosts.

## Verification

- Parse frontmatter instead of validating YAML with regular expressions.
- Reject broken local links, unsupported payload paths, secrets, private paths, and missing required resources.
- List or install the repository through its documented public distribution path without depending on maintainer-local state.

## Decision lineage

- `generalizes`: [ADR-0001](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0001-use-open-agent-skills-spec.long.md).

## Current references

- [Agent Skills specification](https://agentskills.io/specification)
- [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices)

## Revisit

Create a successor if the public package authority changes. Keep volatile installer and host-extension mechanics in this Guide.
