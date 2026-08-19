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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Select each data capability from ownership, consistency, access, lifecycle, scale, and failure requirements instead of a provider default.

Variants: [Short](ac-adr-017-select-relational-cache-queue-and-realtime-capabilities-by-data-requirements.short.md) · [Long, canonical](ac-adr-017-select-relational-cache-queue-and-realtime-capabilities-by-data-requirements.long.md) · **Guide**

## Implementation guide

This guide is non-normative. Re-verify provider products, credential names, limits, and pricing before adoption.

### PostgreSQL, Supabase, and Drizzle

Start from tables, constraints, indexes, transactions, access policies, migrations, and restore requirements. Supabase remains PostgreSQL: enable RLS on exposed tables and write policies for actual actor/tenant access. Prefer current publishable keys for public clients and secret keys for trusted server operations when the target project supports them. Legacy `anon` and `service_role` JWT keys are on a deprecation path; do not encode them as future defaults.

Supabase secret and legacy `service_role` keys bypass RLS. Keep them out of browsers and user-controlled runtimes. Build a narrowly scoped server client per system operation and enforce application authorization before issuing elevated queries. Do not recommend “service/admin credentials whenever client auth is unnecessary.”

Drizzle is a conditional typed SQL/schema and migration choice. Prove required PostgreSQL features, migration workflow, transaction behavior, generated SQL, escape hatches, and restore/rollback process. Direct Supabase clients or SQL may be simpler when their contracts already fit.

### Cache, queue, and realtime

Choose a maintained Redis provider based on protocol compatibility, region, durability, eviction, limits, TLS/auth, observability, backup, and portability. Vercel KV has been retired and is not a selectable current product; Vercel's marketplace Redis integrations are separate provider choices.

Do not implement a queue by pushing arbitrary JSON into Redis without an owned delivery protocol. Use a maintained queue/service when it supplies the required acknowledgment, retry, dead-letter, scheduling, concurrency, and observability behavior, then still make consumers idempotent.

For Supabase Realtime, choose Broadcast, Presence, or Postgres Changes based on the actual semantics and scale guidance. Scope private channels and authorization; initialize from an authorized read and reconcile after reconnect. Avoid assuming a subscription delivers a complete ordered history.

### Realtime authorization and lifecycle

Treat provider setup and client cleanup as part of the feature contract:

- for Postgres Changes, add only selected tables to the `supabase_realtime` publication, grant only required database access, enable RLS on exposed tables, and test the actual user/tenant policies;
- for Broadcast or Presence carrying protected data, use a private channel (`config: { private: true }`) and authorize the topic through policies on `realtime.messages`;
- initialize the UI from an authorized snapshot, subscribe with the same tenant/resource scope, and invalidate the exact identity-complete query key after reconnect, a sequence gap, or an incomplete event;
- call `supabase.removeChannel(channel)` during unmount, logout, tenant change, authorization revocation, and failed partial setup; and
- never place a secret or legacy `service_role` key in the browser to make a subscription work.

Direct cache replacement is safe only when an event carries the complete authorized representation plus a monotonic version or sequence. Otherwise invalidate and refetch. Suspend polling only while channel health, authorization, and gap recovery are proven; resume it on disconnect or uncertainty.

### Stack-deviation comparison

Before adding or replacing a database, ORM, cache, queue, rate limiter, or realtime transport, record:

| Existing or accepted option | Required capability | Evidence-backed gap           | Candidate     | Chosen option            | Docs/ADR impact              | Validation        |
| --------------------------- | ------------------- | ----------------------------- | ------------- | ------------------------ | ---------------------------- | ----------------- |
| `<current data capability>` | `<needed behavior>` | `<gap or "not insufficient">` | `<candidate>` | `<current or candidate>` | `<none, docs, or local ADR>` | `<focused proof>` |

Prefer the existing authority and built-in capability when they satisfy the requirement. If the evidence-backed gap is `not insufficient`, reject the extra service or library and continue only with the authorized bounded change. If the chosen option creates a durable deviation from an accepted target rule, stop the affected implementation and use the target repository's ADR change or successor process; AC-ADR-046 ranks the evidence but grants no write authority.

### Suggested proof

- policy tests with two users in different tenants plus an elevated system case;
- migration up/compatibility/rollback or forward-fix rehearsal and restored backup;
- cache outage and eviction without authoritative-data loss;
- duplicate queue delivery with exactly one externally visible effect;
- realtime reconnect with a missed update followed by snapshot reconciliation.

## Official sources

- [PostgreSQL documentation](https://www.postgresql.org/docs/current/)
- [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Secure data](https://supabase.com/docs/guides/database/secure-data)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Realtime getting started](https://supabase.com/docs/guides/realtime/getting_started)
- [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview)
- [Redis documentation](https://redis.io/docs/latest/)
- [Vercel Redis integrations](https://vercel.com/docs/redis)
