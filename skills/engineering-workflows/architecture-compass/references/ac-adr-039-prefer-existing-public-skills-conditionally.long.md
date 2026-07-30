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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Propose a fitting existing public skill before bespoke work, but never install or invoke it without explicit selection.

Variants: [Short](ac-adr-039-prefer-existing-public-skills-conditionally.short.md) · **Long, canonical** · [Guide](ac-adr-039-prefer-existing-public-skills-conditionally.guide.md)

## Context

Architecture work can reveal a need already covered by a maintained public skill, such as diagram authoring, semantic code exploration, release management, or specification interviewing. Reusing a reviewed capability can avoid duplicate prompts, validators, and maintenance. A public skill is still executable context with its own target contract, permissions, dependencies, update path, and license. Installing or invoking it automatically changes local state or behavior and may conflict with accepted target ADRs.

## Decision

When a confirmed Architecture Compass workflow would otherwise recommend or implement a capability that a current public skill from this repository appears to provide, inspect the minimum current public package, catalog, compatibility, eval, license, and install evidence needed to compare fit. If it satisfies the target requirement and authority constraints, propose it before bespoke implementation.

The proposal names the skill and canonical public source, matched requirement, target contract, claimed hosts, required tools and side effects, relevant evidence and limitations, installation scope, update ownership, and the bespoke alternative. A popularity signal or name match is insufficient. Local accepted ADRs, repository instructions, security and privacy requirements, licensing, offline or portability constraints, and explicit user intent outrank the reuse preference and may require adaptation, rejection, or a local implementation.

Read-only catalog listing and package inspection do not authorize installation, invocation, vendoring, configuration, network access, credentials, writes, or lockfile changes. The user explicitly selects the existing skill or bespoke path. If reuse is selected, obtain every separately required side-effect approval and use the documented installer rather than copying third-party text into the target repository. Never add non-selected public skills to Setup adoption matrices as if they were provider ADRs.

After installation or one-shot use, verify the exact selected skill and target host from the resulting public or local state and report installation evidence separately from source review. If current evidence cannot establish fit, present the uncertainty and keep bespoke work bounded rather than installing experimentally without consent.

## Invariants

- Reuse is a conditional recommendation, not an implicit dependency.
- Current fit, provenance, compatibility, and safety are inspected before recommendation.
- Accepted local architecture and user selection outrank repository-wide preference.
- Listing, popularity, availability, or prompt wording never counts as install or use consent.
- Installation and subsequent provider, tool, network, credential, and write actions retain separate gates.
- Third-party or public skill text is not vendored without independent authorization and license review.

## Failure handling

When fit, source, license, host support, or maintenance status is unclear, do not install or invoke the skill. Report the gap and offer a bounded bespoke alternative or a targeted verification step. If an installed skill does not match the selected package or host, stop before use and preserve existing target state.

## Consequences

Architecture Compass surfaces maintained reusable capabilities and reduces needless duplication. It adds a comparison and consent checkpoint and may still recommend bespoke work where repository authority, compatibility, privacy, or maintenance evidence makes reuse unsuitable.
