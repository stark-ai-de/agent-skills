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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Put every read at the narrowest trusted boundary and choose cache, freshness, hydration, and realtime behavior explicitly.

Variants: [Short](ac-adr-009-choose-read-query-caching-and-freshness-boundaries.short.md) · [Long, canonical](ac-adr-009-choose-read-query-caching-and-freshness-boundaries.long.md) · **Guide**

## Implementation guide

This guide is non-normative. Confirm installed framework and package versions before copying API syntax.

### Route the caller

Use a `server-only` function for a React Server Component that can call the trusted source directly. Add a Route Handler when a browser hook, mobile app, webhook peer, third-party consumer, or independent HTTP cache needs a network contract. Keep authorization in the shared command/read service rather than duplicating it differently in RSC and HTTP adapters.

### Pick one TanStack Query hydration mode

For current TanStack Query v5 integrations:

1. Await `prefetchQuery` and consume with `useQuery` when the server must complete the read before emitting the hydrated UI.
2. Start `prefetchQuery` without awaiting it, include pending queries during dehydration, and consume with `useSuspenseQuery` when the integration supports promise transport and streamed Suspense is intended.
3. Start without awaiting and use `useQuery` only when a deliberately client-managed pending/error state is acceptable; do not claim that this produces server-rendered data.

`prefetchQuery` does not throw. Use `fetchQuery` or a direct server read when a failure must drive framework `not-found`, redirect, or error handling. `QueryErrorResetBoundary` helps only when Suspense or `throwOnError` causes query errors to reach an Error Boundary.

Construct a new server `QueryClient` per request or use a framework-proven request-scoped helper. Keep a stable browser client per app instance, then clear or partition it when identity or tenancy changes. Choose `staleTime` per domain; avoid globally disabling mount refetch as an SSR shortcut.

TanStack Query redacts dehydrated errors by default. Its Next.js example uses `shouldRedactErrors: () => false` only so Next.js can recognize its own control-flow errors while Next.js performs redaction. Do not copy that exception to another framework, and never expose raw server errors to the UI.

### Reconcile realtime state

Start from an authorized snapshot. Apply events by stable row/event identity and version, then refetch after reconnect, sequence gaps, authorization changes, or ambiguous updates. Prefer invalidation when an event lacks the complete authoritative representation.

### Suggested tests

- Use one isolated `QueryClient` per test and disable retries except in retry-specific cases.
- Verify no immediate duplicate fetch for data intentionally considered fresh.
- Test both resolve and reject behavior for pending-query dehydration.
- Confirm that technical server errors are redacted from browser payloads and user-visible fallbacks.
- Simulate two identities and two requests to prove cache separation.

## Official sources

- [Next.js: Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js: Fetching data](https://nextjs.org/docs/app/getting-started/fetching-data)
- [TanStack Query: Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [TanStack Query: Hydration](https://tanstack.com/query/latest/docs/framework/react/reference/hydration)
- [TanStack Query: Important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [TanStack Query: QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [TanStack Query: Testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing)
