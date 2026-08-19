# AC-ADR-039: Prefer Existing Public Skills Conditionally

ID: AC-ADR-039
Title: Prefer Existing Public Skills Conditionally
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: skill-reuse, consent, installation, provenance
Applies when: Architecture Compass would otherwise recommend or implement a capability already offered by a public skill.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Propose a fitting existing public skill before bespoke work, but never install or invoke it without explicit selection.

Variants: **Short** · [Long, canonical](ac-adr-039-prefer-existing-public-skills-conditionally.long.md) · [Guide](ac-adr-039-prefer-existing-public-skills-conditionally.guide.md)

## Decision summary

When target evidence shows that a current public skill from the repository can satisfy a requested capability, Architecture Compass compares and proposes it before bespoke implementation. Local accepted ADRs, instructions, compatibility, security, license, and user intent can override or reject reuse. Listing or read-only inspection does not authorize installation or use; the user explicitly selects the skill and every resulting install, network, credential, or write boundary.

## Context

Reuse can avoid duplicate maintenance, but an automatic install changes repository or user state and can import an unsuitable contract.

## Invariants

- Fit is verified from current public package evidence.
- Target repository authority outranks the reuse preference.
- No public skill is installed, invoked, or vendored from inference alone.

## Consequences

Repositories can reuse maintained capabilities without losing consent or local architecture control, at the cost of one explicit comparison and selection step.
