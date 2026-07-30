# Next.js Query, Write, Retry, and Realtime Lifecycle

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to review the implementation plan for a multi-tenant
Next.js search screen. Require three distinct hydration choices, identity-safe
query keys, user-safe retry and reset behavior, a schema-validated Server
Action, and a complete realtime lifecycle. Return the corrected patterns and
the conditions for choosing each one; do not edit files.

## Deterministic Assertions

- contains: awaited prefetch + useQuery
- contains: streamed pending + useSuspenseQuery
- contains: client-managed pending
- contains: actor
- contains: tenant
- contains: locale
- contains: filter
- contains: canonicalize filters once before key, fetcher, and subscription
- contains: same canonical contract for prefetch, hydration and retry consumers, and realtime
- contains: privilege
- contains: QueryErrorResetBoundary
- contains: ErrorBoundary
- contains: onReset
- contains: resetErrorBoundary
- contains: schema-validated Server Action
- contains: missing expectedVersion is rejected
- contains: empty expectedVersion is rejected
- contains: canonical subscription filters
- contains: resource scope
- contains: server-side subscription authorization
- contains: rebuild subscription on identity, privilege, or filter scope changes
- contains: unmount
- contains: logout
- contains: revocation
- contains: reconnect
- contains: gap
- contains: versioned event
- contains: channel health
- contains: raw technical errors are not exposed
- contains: z.unknown() is rejected
- not_contains: message: error.message
- not_contains: const inputSchema = z.unknown()
- not_contains: refetchOnMount: false,

## Expected Behavior

- Keep the three modes coherent: awaited server prefetch pairs with `useQuery`;
  streamed pending prefetch pairs with `useSuspenseQuery`; deliberately
  client-managed pending starts on the client without mandatory hydration.
- Use separate server and client `queryOptions` helpers around one query
  contract, and make the key factory identity-complete for actor, tenant,
  locale, canonical filters, and privilege changes. Canonicalize raw filters
  once at that contract boundary, then use the exact contract-derived value for
  the query key, server/client fetchers, and realtime subscription.
- Compose `QueryErrorResetBoundary`, an `ErrorBoundary`, `onReset`, and
  `resetErrorBoundary` so a retry resets both query and render error state while
  the retry consumer keeps the same canonical query contract and the user sees
  a sanitized message rather than raw technical details.
- Validate the Server Action input with a concrete schema, re-authorize at the
  command boundary, return a typed result, and invalidate only identity-correct
  keys after success. Reject missing/null and empty/whitespace
  `expectedVersion` before numeric conversion rather than coercing either to
  version zero.
- Treat realtime as a freshness overlay: clean up on unmount, logout, and
  revocation; send actor, tenant, privilege, canonical filters, and resource
  scope to a server-authorized subscription; rebuild it when identity,
  privilege, or filter scope changes; refetch after a gap or reconnect; update
  cache directly only from complete versioned events; and suspend polling only
  while channel health is evidenced.
- Explicitly reject identity-poor keys, universal freshness settings,
  mandatory hydration, and `z.unknown()` as corrected legacy patterns.
