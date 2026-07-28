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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Select each data capability from ownership, consistency, access, lifecycle, scale, and failure requirements instead of a provider default.

Variants: **Short** · [Long, canonical](ac-adr-017-select-relational-cache-queue-and-realtime-capabilities-by-data-requirements.long.md) · [Guide](ac-adr-017-select-relational-cache-queue-and-realtime-capabilities-by-data-requirements.guide.md)

## Decision summary

- Define authoritative ownership, tenancy, schema, consistency, query, transaction, retention, deletion, backup, region, scale, and failure requirements before selecting a datastore or provider.
- PostgreSQL, Supabase, an ORM, Redis, queues, rate limiters, and realtime are conditional capabilities, not one mandatory bundle.
- Keep the relational database authoritative for relational domain state unless another authority is explicitly decided. A cache is disposable and has bounded key, tenancy, TTL, invalidation, failure, and stampede behavior.
- Queue consumers assume redelivery and define idempotency, acknowledgment, retry, dead-letter, ordering, concurrency, and replay semantics.
- Realtime overlays an authoritative snapshot and must recover missed events, enforce subscription scope, and reconcile versions.
- Elevated database credentials stay server-only, narrowly scoped, and isolated. Supabase secret/service credentials bypass RLS and are never a default replacement for user-scoped access.
- Vercel KV is not an active product choice. Select a current Redis provider or another capability only after host, portability, operations, and data requirements are proven.

Apply [AC-ADR-019](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.short.md) ([Long, canonical](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.long.md) · [Guide](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.guide.md)) and [AC-ADR-020](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.short.md) ([Long, canonical](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.long.md) · [Guide](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.guide.md)).
