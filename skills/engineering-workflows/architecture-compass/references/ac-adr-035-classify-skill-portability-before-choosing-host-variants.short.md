# AC-ADR-035: Classify Skill Portability Before Choosing Host Variants

ID: AC-ADR-035
Title: Classify Skill Portability Before Choosing Host Variants
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: portability, host-variants, metadata, catalog
Applies when: Naming, placing, splitting, or adding host metadata to a public skill capability.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Classify agent-bound, host-variant, and adapter-based skills from contract evidence before packaging them.

Variants: **Short** · [Long, canonical](ac-adr-035-classify-skill-portability-before-choosing-host-variants.long.md) · [Guide](ac-adr-035-classify-skill-portability-before-choosing-host-variants.guide.md)

## Decision summary

Every public skill capability is classified as one of three types before naming or packaging: an agent-bound skill; a portable capability represented by optimized host variants because host-specific trigger, evidence, artifact, or lifecycle contracts materially differ; or one portable skill with capability-detected host adapters because trigger and outcome stay the same. `SKILL.md` remains the portable package contract, while host metadata is included only for the hosts a skill intentionally serves and is never universal boilerplate.

## Context

Blind duplication causes drift, but pretending materially different host contracts are identical produces misleading triggers and outputs.

## Invariants

- Classification is based on trigger and outcome contracts, not folder preference.
- Host variants have independent evidence and ownership.
- Metadata extends only the host surface it actually supports.

## Consequences

Catalog placement reflects real portability, while maintainers must collect enough cross-host evidence to justify a split or consolidation.
