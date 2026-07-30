# ADR-0005: Adopt Apache 2.0 license

ID: ADR-0005
Title: Adopt Apache 2.0 license
Status: Accepted
Date: 2026-05-21
Owner: Servrox
Scope: repository
Category: governance
Tags: license, apache-2-0, distribution
Applies when: Licensing repository content or public skill material.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: License the public catalog under Apache-2.0.

Variants: [Short](0005-adopt-apache-2-license.short.md) · **Long, canonical** · [Guide](0005-adopt-apache-2-license.guide.md)

## Decision

We will license this repository's public skill catalog and repository material under Apache-2.0.

## Why

- Apache-2.0 keeps broad public reuse rights for installable skills.
- It adds an explicit patent grant for future contributors and downstream users.
- It is a standard SPDX license supported by package metadata and skill frontmatter.

## Options

- Chosen: Apache-2.0 for the full public catalog.
- Rejected: MIT, because it lacks an explicit patent grant.
- Rejected: Dual MIT/Apache-2.0, because this catalog does not need dual-license complexity.

## Consequences

- Good: Downstream users get clearer patent and redistribution terms.
- Tradeoff: License metadata must stay synchronized across docs and skills.
- Risk: Previously distributed MIT copies keep their original permissions.

## Follow-up

- Update license metadata and public docs to Apache-2.0.
