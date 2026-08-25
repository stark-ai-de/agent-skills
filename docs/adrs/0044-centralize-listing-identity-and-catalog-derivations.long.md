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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-22
Gist: One repository identity and normalization source must drive listing, SEO, release, and OpenAI derivations while portal rules remain adapter-owned.

Variants: [Short](0044-centralize-listing-identity-and-catalog-derivations.short.md) · **Long, canonical** · [Guide](0044-centralize-listing-identity-and-catalog-derivations.guide.md)

## Decision

The repository will maintain one shared listing-identity and normalization module that owns the listing ID, plugin identity, repository-relative artifact paths, GitHub repository slug normalization, and common catalog values. Node and Astro consumers will use thin runtime adapters to that module. Site, SEO, release-descriptor, and OpenAI validation must derive shared identity and normalized values from it; portal-specific asset, routing, worksheet, and OpenAI field rules remain in their owning adapters. No consumer may reimplement shared path or slug derivation.

## Why

- One shared source prevents the site, SEO, release descriptor, and OpenAI validation from independently redefining public identity.
- Thin adapters preserve Astro and Node runtime boundaries without creating a second semantic source.
- Keeping portal-specific rules local prevents a repository-wide identity module from becoming a portal policy grab bag.
- Removing duplicate path and slug logic makes later release and listing changes easier to validate at one owning boundary.

## Options

- Chosen: Extract shared identity, path, slug, and common normalization into one repository module and connect each runtime through a thin adapter.
- Rejected: Keep separate Node, Astro, and OpenAI derivations, because passing local checks would not prove cross-surface identity.
- Rejected: Put every portal field, asset, worksheet, and routing rule in the shared module, because that would erase adapter ownership and runtime boundaries.
- Rejected: Make Astro import a Node-only implementation directly, because build/runtime compatibility must remain explicit.

## Consequences

- Good: Shared listing identity is auditable and consistently consumed by catalog, SEO, release, and OpenAI surfaces.
- Good: A mismatch is localized to the shared module or a named adapter rather than hidden in repeated derivation code.
- Tradeoff: The repository must maintain adapter tests and keep the shared module's runtime contract small.
- Risk: Over-extraction could turn common normalization into an implicit portal policy; portal-specific validators remain the guardrail.

## Follow-up

- Keep this ADR accepted while implementing and verifying the listing identity extraction.
- Prove shared identity through the listing test, `npm run validate:openai`, and `npm run validate:site`.
- Create a reciprocal successor if the identity authority, runtime boundary, or adapter ownership changes materially.
