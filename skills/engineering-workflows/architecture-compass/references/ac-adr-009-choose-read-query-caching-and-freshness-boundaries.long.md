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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Put every read at the narrowest trusted boundary and choose cache, freshness, hydration, and realtime behavior explicitly.

Variants: [Short](ac-adr-009-choose-read-query-caching-and-freshness-boundaries.short.md) · **Long, canonical** · [Guide](ac-adr-009-choose-read-query-caching-and-freshness-boundaries.guide.md)

## Context

Reads can cross a database boundary, a server-only module, HTTP, a React Server Component boundary, a browser cache, and a realtime channel. Treating each layer as mandatory adds latency and duplicate contracts. Omitting a necessary boundary can leak privileged data, share cached data across identities, or leave users with stale state. Rendering and query consumers can also disagree about whether a read is awaited, streamed, or resolved entirely in the browser.

## Decision

### Place the read at its required boundary

Every read identifies the authoritative source and the consumers that require access.

- Server Components and other trusted server code call a server-only read module directly by default. They do not call the application's own Route Handler merely to reach the same process-local source.
- Route Handlers or another explicit HTTP interface are used when browser code, external systems, non-React clients, web standards, independent caching, or protocol semantics require HTTP.
- Domain reads accept plain, authorized inputs and return a stable domain or view contract. Framework request objects, cookies, and database clients do not leak into callers that do not own those concerns.
- Authentication establishes the actor. Authorization and tenant or object scoping are applied before reading protected state. A UI filter is never the enforcement boundary.

### Choose client query state deliberately

A client query library is adopted only when the UI needs client-owned server-state behavior such as cache reuse across navigation, background refresh, mutation coordination, polling, offline recovery, or realtime reconciliation. A static or server-rendered read does not acquire a query cache by default.

When client query state is used:

- query keys include every result-changing identity, tenant, locale, filter, version, and authorization dimension;
- server-side query clients and caches cannot be shared across requests or identities;
- the browser cache may be stable for the application lifetime, but logout, tenant changes, or privilege changes clear or partition protected entries;
- prefetch producer and client consumer choose the same mode: awaited server rendering, streamed Suspense, or client-managed pending/error state;
- error-boundary recovery is used only when the consumer actually throws query errors; otherwise pending and error states remain explicit in the component;
- hydrated errors and payloads do not expose internal details.

### Declare freshness and caching semantics

Each read contract states:

1. which source is authoritative;
2. whether data is request-only, privately cached, or publicly cacheable;
3. how long a result may be considered fresh for its domain;
4. which events invalidate, refresh, or update it;
5. what stale, unavailable, empty, unauthorized, and not-found states mean;
6. whether a failed preload must fail the route or may fall back to client recovery.

No global freshness duration is treated as universally correct. Framework caching, CDN caching, process caches, browser query caches, and database caches are separate layers whose keys, scope, and invalidation must agree. Private or identity-dependent results must not enter a shared public cache.

### Treat realtime as reconciliation

Realtime events accelerate awareness; they do not become the sole record of truth unless the system has explicitly adopted event sourcing. A subscription has an initial authoritative read, stable event identity or versioning, idempotent application, reconnect behavior, and a refetch or replay path after missed or ambiguous events. Permission or tenant changes terminate or reauthorize subscriptions and invalidate affected client state.

## Consequences

Read paths have fewer unnecessary HTTP hops, while actual network contracts remain explicit. Query behavior becomes more predictable and identity-safe. The cost is that teams must write down domain freshness and choose a rendering mode instead of inheriting one global cache policy.

## Validation

- Exercise each protected read as an authorized actor, another actor or tenant, and an unauthenticated caller.
- Prove request-isolated server query clients and identity-partitioned browser keys.
- Test fresh, stale, invalidated, reconnect, missed-event, not-found, and upstream-failure cases.
- For hydration, verify that awaited, streamed, and client-managed examples each use the matching consumer and error behavior.
- Inspect response and cache headers where HTTP or shared caching is part of the decision.
