# Next.js Request and Component Patterns

Use these patterns when the target repository uses Next.js App Router, Server Components, TanStack Query, and Server Actions or equivalent approved tools.

## Route files

Route files stay thin and framework-owned:

```tsx
import { FeatureScreen } from "@/components/feature/feature-screen";

export default function Page() {
  return <FeatureScreen />;
}
```

`loading.tsx`, `error.tsx`, `global-error.tsx`, and `not-found.tsx` are also framework files. They should compose reusable fallback components instead of owning product behavior directly.

## Screen folder shape

Use this shape for substantial data-backed screens, adapted to target repo naming conventions:

```text
apps/<web-app>/src/app/(segment)/feature/page.tsx
apps/<web-app>/src/app/(segment)/feature/loading.tsx
apps/<web-app>/src/app/(segment)/feature/error.tsx
apps/<web-app>/src/app/(segment)/feature/actions.ts
apps/<web-app>/src/components/feature/feature-screen.tsx
apps/<web-app>/src/components/feature/hydrated-feature.tsx
apps/<web-app>/src/components/feature/feature-rcc.tsx
apps/<web-app>/src/components/feature/feature-ui.tsx
apps/<web-app>/src/components/shared/retry-error-boundary.tsx
apps/<web-app>/src/hooks/use-feature.ts
apps/<web-app>/src/lib/queries/feature/feature-query-contract.ts
apps/<web-app>/src/lib/queries/feature/get-feature-query-options.client.ts
apps/<web-app>/src/lib/queries/feature/get-feature-query-options.server.ts
apps/<web-app>/src/lib/server-only/feature/get-feature.ts
```

Use `actions.ts` only for route-local Server Action entrypoints. Put command behavior under `lib/server-only/<domain>` when it needs trusted persistence, cookies, secrets, or service-role clients.

## Screen wrapper and hydrated component

The screen wrapper installs the local retry boundary and `Suspense` fallback. The hydrated component belongs to the pattern; use either `Hydrated<Feature>` or `<Feature>Hydrated` consistently within the project.

```tsx
import { Suspense } from "react";

import { FeatureUiSkeleton } from "@/components/feature/feature-ui";
import { HydratedFeature } from "@/components/feature/hydrated-feature";
import { RetryErrorBoundary } from "@/components/shared/retry-error-boundary";

export function FeatureScreen() {
  return (
    <RetryErrorBoundary>
      <Suspense fallback={<FeatureUiSkeleton />}>
        <HydratedFeature />
      </Suspense>
    </RetryErrorBoundary>
  );
}
```

```tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { connection } from "next/server";

import { FeatureRcc } from "@/components/feature/feature-rcc";
import { getFeatureQueryOptionsServer } from "@/lib/queries/feature/get-feature-query-options.server";
import { getQueryClient } from "@/lib/queries/tanstack/get-query-client";

export async function HydratedFeature() {
  await connection();

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(getFeatureQueryOptionsServer());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FeatureRcc />
    </HydrationBoundary>
  );
}
```

Use request-time rendering helpers only when the screen needs request-time behavior. Static or cached screens should avoid them.

## Query client helper

Use one helper for server and browser query client creation. The server branch shares one client during server rendering. The browser branch uses a singleton so client navigation and mutations operate on one cache.

```ts
import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryClient,
} from "@tanstack/react-query";
import { cache } from "react";

const staleTime = 5 * 60 * 1000;

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
        shouldRedactErrors: () => false,
      },
      queries: {
        refetchOnMount: false,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        staleTime,
      },
    },
  });

const getServerQueryClient = cache(makeQueryClient);
let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) {
    return getServerQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}
```

## Retry error boundary

The retry boundary is the local wrapper around `react-error-boundary`. It can compose `QueryErrorResetBoundary` from TanStack Query so retrying a failed screen also resets query error state.

```tsx
"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

export function RetryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div role="alert">
              <p>Could not load this view.</p>
              <p>{error instanceof Error ? error.message : "Unknown error."}</p>
              <button onClick={resetErrorBoundary} type="button">
                Retry
              </button>
            </div>
          )}
          onReset={reset}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

The real fallback should render target-project UI and call `resetErrorBoundary()` from its retry control.

## React Client Component controller and UI leaves

The React Client Component controller owns hooks, mutations, local client state, optimistic/cache updates, browser-only effects, and event handlers:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";

import { FeatureUi } from "@/components/feature/feature-ui";
import { getFeatureQueryOptionsClient } from "@/lib/queries/feature/get-feature-query-options.client";

export function FeatureRcc() {
  const featureQuery = useQuery(getFeatureQueryOptionsClient());

  return <FeatureUi data={featureQuery.data ?? []} />;
}
```

Pure UI components receive data and callbacks. They should not import service clients, server-only modules, Server Actions, query clients, or persistence details.

## Read path

Read paths have explicit files: route handler, server-only read module, query contract, client query options, and server query options.

Thin route handler:

```ts
import { runAuthenticatedJsonRoute } from "@/lib/server-only/http/authenticated-json-route";
import { getCurrentFeature } from "@/lib/server-only/feature/get-current-feature";

export async function GET() {
  return runAuthenticatedJsonRoute({
    fallbackError: "Unable to load feature data.",
    run: getCurrentFeature,
    sessionError: "Feature data requires an active session.",
  });
}
```

Server-only read module:

```ts
import "server-only";

import { getCurrentSession } from "@/lib/server-only/auth/current-session";
import { getFeatureForAccount } from "@/lib/server-only/feature/feature-row.service";

export async function getCurrentFeature() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Feature data requires an active session.");
  }

  return getFeatureForAccount({ accountId: session.accountId });
}
```

Query contract:

```ts
export const featureApiEndpoints = {
  current: "/api/feature",
} as const;

export const featureQueryKeys = {
  current: ["feature"],
} as const;
```

Client query options:

```ts
import { queryOptions } from "@tanstack/react-query";

import { fetchJsonOrThrow } from "@/lib/utils/fetch-json-or-throw";

import { featureApiEndpoints, featureQueryKeys } from "./feature-query-contract";

export function getFeatureQueryOptionsClient() {
  return queryOptions({
    queryFn: () => fetchJsonOrThrow(featureApiEndpoints.current),
    queryKey: featureQueryKeys.current,
  });
}
```

Server query options:

```ts
import "server-only";

import { queryOptions } from "@tanstack/react-query";

import { getCurrentFeature } from "@/lib/server-only/feature/get-current-feature";

import { featureQueryKeys } from "./feature-query-contract";

export function getFeatureQueryOptionsServer() {
  return queryOptions({
    queryFn: getCurrentFeature,
    queryKey: featureQueryKeys.current,
  });
}
```

## Write path

Write paths use route-local Server Actions for trusted mutations initiated from the browser:

```ts
"use server";

import { z } from "zod";

import { createFeatureResource } from "@/lib/server-only/feature/feature-command.service";
import { runAuthenticatedActionResult } from "@/lib/server-only/actions/run-authenticated-action-result";

const createFeatureActionInputSchema = z.unknown();

export async function createFeatureAction(formInput: unknown) {
  return runAuthenticatedActionResult({
    fallbackError: "Unable to create feature resource.",
    input: formInput,
    run: async ({ accountId, input }) =>
      createFeatureResource({
        accountId,
        formInput: input,
      }),
    schema: createFeatureActionInputSchema,
  });
}
```

Shared action wrapper:

```ts
import "server-only";

import type { ZodType } from "zod";

import { requireCurrentSession } from "@/lib/server-only/auth/require-current-session";
import { runActionResult } from "@/lib/server-only/actions/run-action-result";

export async function runAuthenticatedActionResult<TInput, TData>(input: {
  fallbackError: string;
  input: unknown;
  run: (context: { accountId: string; input: TInput }) => Promise<TData>;
  schema: ZodType<TInput>;
}) {
  return runActionResult({
    fallbackError: input.fallbackError,
    run: async () => {
      const session = await requireCurrentSession();
      const parsedInput = input.schema.parse(input.input);

      return input.run({
        accountId: session.accountId,
        input: parsedInput,
      });
    },
  });
}
```

Use an HTTP route instead of a Server Action only when the write is a public HTTP integration, webhook, non-React client API, or otherwise benefits from explicit HTTP semantics.

## Optional realtime freshness

Realtime can be layered on top of a normal TanStack Query contract when the product benefits from live freshness.

Rules:

- Keep the normal API route or server query helper as the canonical read path.
- Subscribe from a client hook and clean up the channel on unmount.
- Update the exact query key produced by the query option factory.
- Turn off polling only when the live subscription is active and reliable.
- Use only browser-safe credentials in client code.
- Configure publication, grants, and authorization deliberately.

Realtime is a freshness overlay. It is not the authorization boundary and does not replace Server Actions or server-only command modules for trusted writes.
