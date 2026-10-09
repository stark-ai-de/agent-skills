# ADR-0064: Reuse explicit skill preselection with separate provisioning grants

ID: ADR-0064
Title: Reuse explicit skill preselection with separate provisioning grants
Status: Accepted
Date: 2026-10-09
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: product-planning, skill-routing, authority
Applies when: Integrating the three-skill product-planning contract and its release gates.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-09
Gist: Keep coordinated product planning bounded by canonical outcomes and actual user authority.

Variants: [Short](0064-reuse-explicit-skill-preselection-with-separate-provisioning-grants.short.md) · [Long, canonical](0064-reuse-explicit-skill-preselection-with-separate-provisioning-grants.long.md) · **Guide**

This guide is non-normative.

## How to apply

See the linked Architecture Zoom integration specification and Architecture Compass provider decisions AC-ADR-067 and AC-ADR-068. Keep repository acceptance, target adoption and operational grants distinct. This implements the maintainer-requested coordination design in PR #141. Acceptance of this provider-repository decision does not accept another repository's ADR, authorize installing skills there, or authorize publication.

## Verification

Use ADR, Compass, product-planning, projection and release-impact checks. Promotion additionally requires genuine baseline/candidate and host evidence.

## Revisit

Revisit through a reciprocal successor if skill ownership, selection authority, provisioning boundaries, or promotion evidence obligations change. Host syntax and documentation updates alone belong in the non-normative Guide.
