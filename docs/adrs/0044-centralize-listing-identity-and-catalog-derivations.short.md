# ADR-0044: Centralize listing identity and catalog derivations

ID: ADR-0044
Title: Centralize listing identity and catalog derivations
Status: Accepted
Date: 2026-08-22
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: listing, identity, normalization, seo, catalog
Applies when: Adding, validating, or deriving public plugin listing, catalog, SEO, release, or OpenAI submission data.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-22
Gist: One repository identity and normalization source must drive listing, SEO, release, and OpenAI derivations while portal rules remain adapter-owned.

Variants: **Short** · [Long, canonical](0044-centralize-listing-identity-and-catalog-derivations.long.md) · [Guide](0044-centralize-listing-identity-and-catalog-derivations.guide.md)

## Decision

The repository will maintain one shared listing-identity and normalization module that owns the listing ID, plugin identity, repository-relative artifact paths, GitHub repository slug normalization, and common catalog values. Node and Astro consumers will use thin runtime adapters to that module. Site, SEO, release-descriptor, and OpenAI validation must derive shared identity and normalized values from it; portal-specific asset, routing, worksheet, and OpenAI field rules remain in their owning adapters. No consumer may reimplement shared path or slug derivation.

## Context

Listing, SEO, release, and OpenAI surfaces currently meet at the same plugin identity but have different runtime and portal boundaries. Repeated path and GitHub-slug derivation can make those surfaces disagree even when each local validator passes.

## Consequences

- Good: Shared identity and normalization have one auditable source and cross-surface drift becomes attributable.
- Tradeoff: Astro and Node still need explicit thin adapters and runtime-compatible boundaries.
- Risk: A careless extraction could move portal-specific rules into the shared module; adapter ownership and focused validation must prevent that.
