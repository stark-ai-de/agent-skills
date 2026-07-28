# AC-ADR-017: Select Relational, Cache, Queue, and Realtime Capabilities by Data Requirements

ID: AC-ADR-017
Title: Select Relational, Cache, Queue, and Realtime Capabilities by Data Requirements
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: security-data
Tags: postgresql, supabase, orm, redis, cache, queue, rate-limits, realtime, rls
Applies when: Choosing persistence, an ORM, cache, queue, rate limiting, or realtime transport.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Select each data capability from ownership, consistency, access, lifecycle, scale, and failure requirements instead of a provider default.

Variants: [Short](ac-adr-017-select-relational-cache-queue-and-realtime-capabilities-by-data-requirements.short.md) · **Long, canonical** · [Guide](ac-adr-017-select-relational-cache-queue-and-realtime-capabilities-by-data-requirements.guide.md)

## Context

Relational storage, hosted backend platforms, ORMs, caches, queues, rate limiters, and realtime transports solve different requirements. Treating them as one default stack can make a cache authoritative accidentally, bypass row security, or add distributed failure modes without product need. Provider product names and credential models also change faster than durable data policy.

## Decision

### Define the data contract first

For each persisted or transmitted data class, record:

- authoritative owner, tenant/subject scope, writers, readers, and trust boundaries;
- relational constraints, query shapes, transaction and consistency requirements;
- volume, item size, throughput, latency, hotspots, region/residency, and availability;
- retention, deletion, export, audit, encryption, backup, restore, and recovery objectives;
- migration, schema compatibility, portability, operations, observability, and cost.

Select only the capabilities required by that contract. A platform that combines several capabilities does not make all of them mandatory.

### Keep relational authority explicit

PostgreSQL is an eligible relational authority when constraints, transactions, joins, indexing, mature operations, and its ecosystem fit. Supabase is an eligible managed platform when its PostgreSQL, identity, storage, realtime, operational model, regions, and contracts fit. Neither is a universal default.

An ORM or typed query layer is adopted when its schema, migration, query composition, type, or portability value exceeds the cost of abstraction and escape hatches. Database constraints remain authoritative for integrity. Raw or advanced SQL is allowed behind an owned data-access boundary when required behavior cannot be represented safely.

User-facing database access enforces tenant, subject, and object scope in the database policy and trusted service boundaries, not UI filtering. Elevated credentials bypassing row-level policy are isolated in server-only modules and used only for named system operations whose authorization and audit behavior are explicit.

### Treat cache and rate limiting as derived state

A cache has an authoritative source, namespaced and tenant-safe keys, serialization/version policy, TTL or invalidation, maximum staleness, eviction behavior, stampede control, and failure mode. Cache loss cannot corrupt authoritative data. Sensitive values require explicit need and controls; broad scans or unbounded keys are avoided.

Redis is eligible for cache, coordination, rate limiting, queue backing, or other high-throughput ephemeral capability when its data model and operational semantics fit. It is not automatically a substitute for relational persistence. Rate limiting defines the protected resource, identity/key, algorithm, window, distributed consistency, bypass policy, user response, and fail-open/fail-closed behavior.

### Make queue delivery semantics explicit

Every queue contract defines payload schema/version, producer, consumer, delivery guarantee, acknowledgment point, retry/backoff, visibility or lease, maximum attempts, dead-letter/recovery, ordering scope, concurrency, idempotency, deduplication, retention, and observability. Consumers assume duplicate and delayed delivery unless a stronger guarantee is proven. Side effects use idempotency keys or durable operation state.

### Use realtime as an overlay

Realtime begins with an authorized authoritative snapshot. Subscriptions are scoped by actor and tenant, reauthorized when identity changes, and closed on logout or revocation. Events carry stable identity/version information or cause targeted invalidation. Clients handle duplicate, reordered, missed, and delayed events and refetch or replay after reconnect or a sequence gap. Realtime transport is not the only history unless an event-sourced decision says so.

## Consequences

Data systems remain simpler until requirements justify distributed capability, and credentials/caches cannot silently become authority. Teams must specify operational semantics before adopting convenient managed products.

## Validation

- Test database constraints, transactions, tenant policies, authorized access, cross-tenant denial, and elevated-client isolation.
- Restore a representative backup and verify retention/deletion/export behavior.
- Exercise cache hit, miss, stale, invalidation, eviction, outage, stampede, key-version, and tenant-separation cases.
- Redeliver, reorder, delay, poison, and dead-letter queue messages; prove idempotent effects and replay.
- Disconnect realtime clients, introduce missed/duplicate events, change authorization, reconnect, and prove authoritative reconciliation.
- Load-test representative queries and operational limits before claiming capacity.
