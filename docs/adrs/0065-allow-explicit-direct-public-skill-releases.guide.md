# ADR-0065: Allow explicit direct public skill releases

ID: ADR-0065
Title: Allow explicit direct public skill releases
Status: Accepted
Date: 2026-10-09
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: skills, public-catalog, release, acceptance
Applies when: A maintainer explicitly requests a skill in the public release rather than incubation.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0004, ADR-0006, ADR-0008
Superseded by: None
Guide verified: 2026-10-09
Gist: Explicit public release intent selects the public source tree while evidence claims remain bounded.

Variants: [Short](0065-allow-explicit-direct-public-skill-releases.short.md) · [Long, canonical](0065-allow-explicit-direct-public-skill-releases.long.md) · **Guide**

This guide is non-normative. Long is canonical.

## How to apply

The maintainer explicitly requested Architecture Zoom as a regular public skill in the next release and accepted its specification and ADRs on 2026-10-09. That request selects this direct-public route; it does not assert a test outcome. Record the current source fingerprint, release scope and unobserved behavior in the skill's public-admission record. Preserve genuine captures separately.

Move an existing candidate to the single public source, remove the internal marker, update catalog/install entries and the selected bundle/listing, then regenerate projections. An accepted public-admission record can authorize that placement without a fabricated native-host qualification report. The qualification CLI must continue to reject that record as non-observational evidence.

## Verification

Run the mandatory release-intent aggregate and the owning catalog, projection, archive and installation gates. Read back the final PR. Release Please and protected publication retain their existing ownership. A later host-qualification receipt needs real captures for its exact payload and declared host claims.

## Lineage

This decision succeeds ADR-0004 and ADR-0006's incubation-only placement rule and ADR-0008's unconditional proof-before-promotion rule. Their locked Decision text remains historical and unchanged. Quality, activation, utility and maintenance remain assessment criteria: ordinary promotion requires demonstrated improvement, while an explicitly requested direct public release may record maintainer acceptance with disclosed behavioral evidence gaps. ADR-0063/0064 continue to govern coordination and separate action authority; their evidence requirements still apply to claimed host behavior.

## Revisit

Use a reciprocal successor ADR if public-admission authority or required release evidence changes. Preserve the accepted Decision and recorded limitations.
