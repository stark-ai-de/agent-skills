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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-22
Gist: One repository identity and normalization source must drive listing, SEO, release, and OpenAI derivations while portal rules remain adapter-owned.

Variants: [Short](0044-centralize-listing-identity-and-catalog-derivations.short.md) · [Long, canonical](0044-centralize-listing-identity-and-catalog-derivations.long.md) · **Guide**

This guide is non-normative. [Long](0044-centralize-listing-identity-and-catalog-derivations.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Identify the current listing ID, plugin identity, artifact paths, repository slug, and common normalization inputs.
2. Put only those shared values and transformations in the repository module.
3. Keep Astro and Node integration in thin adapters with explicit runtime-compatible imports.
4. Leave assets, portal routing, worksheet fields, and OpenAI field rules in their owning adapters.
5. Remove duplicate shared path and slug derivation only after both adapters use the common source.

## Verification

- Run the focused listing test and compare the site, SEO, release-descriptor, and OpenAI-derived identities.
- Run `npm run validate:openai` and `npm run validate:site`.
- Confirm that a portal-only rule can change in its adapter without changing the shared identity module.

## Current references

- The repository release descriptor, OpenAI listing contract, site listing/SEO code, and their focused tests are the owning implementation boundaries.
- ADR-0043 keeps public listing identity, bundle membership, and release identity distinct; this ADR centralizes shared derivation without merging those authorities.

## Revisit

Create a new ADR that supersedes this record if the shared identity authority, runtime adapter boundary, or portal-rule ownership changes.
