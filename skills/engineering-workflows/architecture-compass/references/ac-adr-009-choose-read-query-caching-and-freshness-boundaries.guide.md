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
Guide verified: 2026-07-29
Gist: Put every read at the narrowest trusted boundary and choose cache, freshness, hydration, and realtime behavior explicitly.

Variants: [Short](ac-adr-009-choose-read-query-caching-and-freshness-boundaries.short.md) · [Long, canonical](ac-adr-009-choose-read-query-caching-and-freshness-boundaries.long.md) · **Guide**

## Implementation guide

This guide is non-normative. Confirm installed framework and package versions before copying API syntax.

### Route the caller

Use a `server-only` function for a React Server Component that can call the trusted source directly. Add a Route Handler when a browser hook, mobile app, webhook peer, third-party consumer, or independent HTTP cache needs a network contract. Keep authorization in the shared command/read service rather than duplicating it differently in RSC and HTTP adapters.

Do not use a Server Action as a browser query function. Server Actions are mutation-oriented and queued; browser reads use the selected HTTP or RPC contract instead.

A Route Handler remains a thin public adapter:

```ts
export async function GET(request: Request) {
  const actor = await requireActor();
  const filters = projectFiltersSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const projects = await loadProjects({ actor, filters });
  return Response.json(projects);
}
```

`loadProjects` owns tenant and object authorization. A Server Component calls it directly with its trusted actor instead of making an HTTP request back into the same application.

### Share an identity-complete query contract

Share the browser-safe filter input and create one canonical query contract before building a key, fetcher, or subscription. Keep the browser transport and trusted server read separate:

```ts
export type QueryIdentity = {
  actorKey: string;
  tenantKey: string;
  locale: string;
  privilegeKey: string;
};

export type ProjectFilterInput = { status?: "active" | "archived" };
export type CanonicalProjectFilters = Readonly<{
  status: "active" | "archived" | null;
}>;

export const canonicalizeProjectFilters = (
  filterInput: ProjectFilterInput,
): CanonicalProjectFilters => ({
  status: filterInput.status ?? null,
});

export const projectsQueryContract = (identity: QueryIdentity, filterInput: ProjectFilterInput) => {
  const canonicalFilters = canonicalizeProjectFilters(filterInput);
  return {
    canonicalFilters,
    queryKey: ["projects", identity, canonicalFilters] as const,
  } as const;
};

export type ProjectsQueryContract = ReturnType<typeof projectsQueryContract>;

export const projectsClientOptions = (contract: ProjectsQueryContract) =>
  queryOptions({
    queryKey: contract.queryKey,
    queryFn: () => fetchProjectsHttp(contract.canonicalFilters),
  });

export const projectsServerOptions = (actor: Actor, contract: ProjectsQueryContract) =>
  queryOptions({
    queryKey: contract.queryKey,
    queryFn: () => loadProjects({ actor, filters: contract.canonicalFilters }),
  });
```

The server derives `actor` and `QueryIdentity` from trusted session state. Create `projectsQueryContract` once at the route or controller boundary, pass that browser-safe contract to the server/client options and realtime layer, and never rebuild a key or fetcher from raw `ProjectFilterInput`. In this example, `null` is the canonical "no status filter" sentinel; both HTTP encoding and the trusted read must interpret it as no status predicate rather than the literal string `"null"`. Server and browser may reconstruct the contract on their respective side of a serialized boundary, but identical input must yield the same canonical filter value and key. The browser query key partitions cache state but never grants access; its HTTP request is authenticated and authorized again. Include every dimension that can change the representation, such as actor, tenant, locale, privilege class, and filters. Clear or replace the browser `QueryClient` on login, logout, tenant switch, or privilege change.

### Pick one TanStack Query hydration mode

For current TanStack Query v5 integrations:

1. Await `prefetchQuery` and consume with `useQuery` when the server must complete the read before emitting the hydrated UI.
2. Start `prefetchQuery` without awaiting it, include pending queries during dehydration, and consume with `useSuspenseQuery` when the integration supports promise transport and streamed Suspense is intended.
3. Skip server prefetch and use `useQuery` when a deliberately client-managed pending/error state is acceptable; do not claim that this produces server-rendered data.

An awaited server-prefetch boundary can stay small:

```tsx
export async function AwaitedProjects(props: ReadProps) {
  const queryClient = createServerQueryClient();
  const contract = projectsQueryContract(props.identity, props.filters);
  await queryClient.prefetchQuery(projectsServerOptions(props.actor, contract));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsList contract={contract} />
    </HydrationBoundary>
  );
}
```

`ProjectsList` uses `useQuery(projectsClientOptions(contract))`, so hydration, the browser fetcher, and later realtime reconciliation share the contract's canonical filters and key. It renders pending, error, empty, and success as distinct states rather than using `data ?? []` to collapse them.

For deliberate streamed Suspense, start the prefetch without awaiting it, dehydrate pending queries, and consume with `useSuspenseQuery` behind a real `<Suspense>` boundary:

```tsx
const contract = projectsQueryContract(identity, filters);
void queryClient.prefetchQuery(projectsServerOptions(actor, contract));

const state = dehydrate(queryClient, {
  shouldDehydrateQuery: (query) =>
    defaultShouldDehydrateQuery(query) || query.state.status === "pending",
});

return (
  <HydrationBoundary state={state}>
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsSuspenseList contract={contract} />
    </Suspense>
  </HydrationBoundary>
);
```

`ProjectsSuspenseList` uses `useSuspenseQuery`, not `useQuery`. For client-managed pending, omit server prefetch and `HydrationBoundary` entirely and render the `useQuery` pending state in the controller.

`prefetchQuery` does not throw. Use `fetchQuery` or a direct server read when a failure must drive framework `not-found`, redirect, or error handling. `QueryErrorResetBoundary` helps only when Suspense or `throwOnError` causes query errors to reach an Error Boundary.

Construct a new server `QueryClient` per request or use a framework-proven request-scoped helper. Keep a stable browser client per app instance, then clear or partition it when identity or tenancy changes. Choose `staleTime` per domain; avoid globally disabling mount refetch as an SSR shortcut.

TanStack Query redacts dehydrated errors by default. Its Next.js example uses `shouldRedactErrors: () => false` only so Next.js can recognize its own control-flow errors while Next.js performs redaction. Do not copy that exception to another framework, and never expose raw server errors to the UI.

### Reset the query that actually failed

Wire retry to both the React boundary and TanStack Query:

```tsx
export function ProjectsRetryBoundary({ contract }: { contract: ProjectsQueryContract }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <button type="button" onClick={resetErrorBoundary}>
              Try again
            </button>
          )}
        >
          <Suspense fallback={<ProjectsSkeleton />}>
            <ProjectsSuspenseList contract={contract} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

The boundary receives the same canonical query contract as prefetch and hydration; retry must not reconstruct a consumer from raw identity/filter props. The fallback stays generic; log sanitized technical detail with a correlation ID on the trusted side. A Next.js segment `error.tsx` is a different recovery layer and must not be mistaken for query reset wiring.

### Reconcile realtime state

Start from an authorized snapshot. Reuse the query contract's canonical filters for its key, HTTP/trusted fetcher, resource scope, and subscription; do not normalize again inside the realtime layer. Pass that complete scope to the subscription boundary; the trusted server authenticates the connection and authorizes the actor against the requested tenant and resource scope. Client-supplied scope values constrain a request but never grant access. Apply events by stable row/event identity and version, then refetch after reconnect, sequence gaps, authorization changes, or ambiguous updates. Prefer invalidation when an event lacks the complete authoritative representation.

```ts
const contract = useMemo(
  () => projectsQueryContract(identity, filterInput),
  [
    filterInput.status,
    identity.actorKey,
    identity.locale,
    identity.privilegeKey,
    identity.tenantKey,
  ],
);
const { canonicalFilters, queryKey } = contract;
const projectsQuery = useQuery(projectsClientOptions(contract));
const resourceScope = useMemo(
  () =>
    projectResourceScope({
      actorKey: identity.actorKey,
      tenantKey: identity.tenantKey,
      privilegeKey: identity.privilegeKey,
      locale: identity.locale,
      filters: canonicalFilters,
    }),
  [canonicalFilters, identity.actorKey, identity.locale, identity.privilegeKey, identity.tenantKey],
);

useEffect(() => {
  const subscription = subscribeToProjects({
    actorKey: identity.actorKey,
    tenantKey: identity.tenantKey,
    privilegeKey: identity.privilegeKey,
    locale: identity.locale,
    filters: canonicalFilters,
    resourceScope,
    onEvent(event) {
      if (event.complete && event.version !== undefined) {
        queryClient.setQueryData(queryKey, (current) => applyVersionedEvent(current, event));
      } else {
        void queryClient.invalidateQueries({ queryKey, exact: true });
      }
    },
    onGap() {
      void queryClient.invalidateQueries({ queryKey, exact: true });
    },
    onReconnect() {
      void queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });

  return () => subscription.unsubscribe();
}, [
  canonicalFilters,
  identity.actorKey,
  identity.locale,
  identity.privilegeKey,
  identity.tenantKey,
  queryClient,
  queryKey,
  resourceScope,
]);
```

The contract's `useMemo` dependency list must enumerate every identity and raw-input field consumed during canonicalization; adding a filter without adding its dependency is a stale-scope defect. The shown query and subscription receive the same contract-derived value; downstream code receives only `canonicalFilters` and `queryKey`. Recreate or remove the subscription on actor or tenant changes, privilege changes, locale changes, canonical-filter or resource-scope changes, logout, and authorization revocation. The server must also reject or terminate a subscription whose authorization no longer holds. Keep polling active unless channel health and reconnect reconciliation are proven; if polling is suspended, restart it on disconnect or sequence uncertainty.

### Compare optional client read layers

| Candidate                    | Prefer when                                                          | Avoid when                                                   |
| ---------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Direct Server Component read | one trusted server render owns the read                              | a browser or external consumer needs the contract            |
| HTTP plus TanStack Query     | browser cache, retries, refetch, or shared HTTP consumers are needed | the same server component would call its own route           |
| Typed RPC                    | target already owns an end-to-end typed RPC contract                 | it would duplicate a stable HTTP or direct-read boundary     |
| GraphQL                      | clients need a governed graph and field selection across domains     | one small feature would own the schema and operations alone  |
| SWR                          | the repository already owns its simpler HTTP-cache model             | adding a second client-cache authority beside TanStack Query |

### Suggested tests

- Use one isolated `QueryClient` per test and disable retries except in retry-specific cases.
- Verify no immediate duplicate fetch for data intentionally considered fresh.
- Test both resolve and reject behavior for pending-query dehydration.
- Confirm that technical server errors are redacted from browser payloads and user-visible fallbacks.
- Simulate two identities and two requests to prove cache separation.
- Prove equivalent raw inputs such as `{}` and `{ status: undefined }` produce the same canonical filter/key and that client fetch, server fetch, and subscription all receive that contract-derived value.

## Official sources

- [Next.js: Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js: Fetching data](https://nextjs.org/docs/app/getting-started/fetching-data)
- [TanStack Query: Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [TanStack Query: Hydration](https://tanstack.com/query/latest/docs/framework/react/reference/hydration)
- [TanStack Query: Important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [TanStack Query: QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [TanStack Query: Testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing)
