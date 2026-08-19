# AC-ADR-009: Choose Read, Query, Caching, and Freshness Boundaries

ID: AC-ADR-009
Title: Choose Read, Query, Caching, and Freshness Boundaries
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: frontend
Tags: reads, server-components, http, tanstack-query, caching, freshness, realtime
Applies when: Data is read by Server Components, browser clients, external clients, or realtime consumers.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Put every read at the narrowest trusted boundary and choose cache, freshness, hydration, and realtime behavior explicitly.

Variants: **Short** · [Long, canonical](ac-adr-009-choose-read-query-caching-and-freshness-boundaries.long.md) · [Guide](ac-adr-009-choose-read-query-caching-and-freshness-boundaries.guide.md)

## Decision summary

- A Server Component reads directly from a trusted server-side module unless an HTTP boundary is independently required.
- Route Handlers expose reads to browser code, external consumers, or protocol-level integrations. They are not an internal hop for every Server Component.
- Add a client query library only when the product needs client cache, refetch, mutation coordination, offline behavior, or similar server-state semantics.
- Query identity includes every tenant, actor, locale, filter, and authorization dimension that can change the result. Server-side query caches are request-isolated.
- Each read declares its authority, freshness, cache scope, invalidation path, error semantics, and one coherent rendering mode: awaited SSR, streamed Suspense, or client-managed pending state.
- Realtime is an overlay on an authoritative read. Reconnect and missed-event recovery must re-establish state rather than assuming an event stream is complete.

Use [AC-ADR-019](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.short.md) ([Long, canonical](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.long.md) · [Guide](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.guide.md)) for trust-boundary controls and [AC-ADR-020](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.short.md) ([Long, canonical](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.long.md) · [Guide](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.guide.md)) for data ownership and tenancy.
