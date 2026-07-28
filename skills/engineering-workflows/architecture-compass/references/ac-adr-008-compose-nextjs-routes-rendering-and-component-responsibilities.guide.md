# AC-ADR-008: Compose Next.js Routes, Rendering, and Component Responsibilities

ID: AC-ADR-008
Title: Compose Next.js Routes, Rendering, and Component Responsibilities
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: frontend
Tags: nextjs, rendering, server-components, client-components
Applies when: A Next.js App Router route, layout, fallback, screen, or interactive component boundary is created or materially changed.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep App Router entrypoints thin, render on the server by default, and isolate only necessary client interaction.

Variants: [Short](ac-adr-008-compose-nextjs-routes-rendering-and-component-responsibilities.short.md) · [Long, canonical](ac-adr-008-compose-nextjs-routes-rendering-and-component-responsibilities.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Choose the smallest coherent shape

For a static or server-rendered page:

```text
app/<route>/page.tsx
components/<feature>/<feature>-screen.tsx
```

For a substantial interactive screen:

```text
app/<route>/page.tsx
app/<route>/loading.tsx          # only when route-level loading UX helps
app/<route>/error.tsx            # only when segment recovery is useful
components/<feature>/<feature>-screen.tsx
components/<feature>/<feature>-controller.tsx
components/<feature>/<feature>-ui.tsx
```

Add a hydrated server component only when TanStack Query state must cross into a client cache. Read AC-ADR-009 before choosing the query and freshness behavior, and AC-ADR-010 before wiring a mutation.

## Thin route example

```tsx
import { FeatureScreen } from "@/components/feature/feature-screen";

export default function Page() {
  return <FeatureScreen />;
}
```

An async screen can read through the selected trusted server boundary and pass a browser-safe view model to a focused controller:

```tsx
import { FeatureController } from "./feature-controller";
import { loadFeatureView } from "@/lib/server-only/feature/load-feature-view";

export async function FeatureScreen() {
  const initialView = await loadFeatureView();
  return <FeatureController initialView={initialView} />;
}
```

The controller declares `"use client"` and owns only the interaction that requires it. The UI leaf can remain a plain component receiving data and callbacks.

## Rendering-mode checklist

| Question                                     | Awaited server          | Streamed Suspense                          | Client pending                      |
| -------------------------------------------- | ----------------------- | ------------------------------------------ | ----------------------------------- |
| Is data required before useful HTML?         | usually                 | partially                                  | no                                  |
| Does the server read it?                     | yes                     | yes                                        | no initial read                     |
| Does a fallback represent real waiting work? | route loading           | Suspense fallback                          | controller pending UI               |
| Where are errors handled?                    | segment/server boundary | throwing Suspense query or server boundary | controller unless explicitly thrown |

When hydrating TanStack Query, create server cache state with request- and identity-safe ownership, await required prefetches unless deliberately streaming a pending query, and align the client hook with the chosen error boundary. Avoid a process-global server cache or browser cache that survives an identity change without clearing or partitioning.

Call `connection()` only when the route intentionally requires request-time rendering under the active Next.js caching model. Reading cookies, headers, or other dynamic APIs may already establish request dependence; check the current framework documentation and build output.

## Validation scenarios

- Render the route with JavaScript disabled or before hydration when server HTML is part of the contract.
- Exercise loading, success, empty, not-found, and error states through their real data path.
- Verify the retry control resets the state that actually failed.
- Inspect the client dependency graph or bundle for unexpected trusted modules and excessive client scope.
- Build the production Next.js app to catch server/client and prerendering errors that unit tests cannot reproduce.

## Official sources

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js project structure and file conventions](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js loading UI and streaming](https://nextjs.org/docs/app/getting-started/linking-and-navigating#streaming)
- [Next.js error handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Next.js `connection`](https://nextjs.org/docs/app/api-reference/functions/connection)
- [TanStack Query advanced server rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [TanStack Query `QueryErrorResetBoundary`](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
