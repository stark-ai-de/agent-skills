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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Keep App Router entrypoints thin, render on the server by default, and isolate only necessary client interaction.

Variants: [Short](ac-adr-008-compose-nextjs-routes-rendering-and-component-responsibilities.short.md) · **Long, canonical** · [Guide](ac-adr-008-compose-nextjs-routes-rendering-and-component-responsibilities.guide.md)

## Context

App Router permits server and client rendering to be mixed, but careless boundaries grow client bundles, expose trusted dependencies, duplicate request paths, and create loading or retry UI that never observes the actual failure. A mandatory hydrated screen stack also over-engineers simple pages. The route needs an explicit composition and rendering contract rather than a copied folder template.

## Decision

Next.js App Router files remain framework-owned entrypoints. `page.tsx`, `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, metadata files, and Route Handlers contain only the framework contract and delegate product behavior to named owning components or server modules.

Server Components are the default. They compose layouts and screens, perform trusted reads through the selected server boundary, and pass only browser-safe serializable data to Client Components. A module declares `"use client"` only when it directly needs interactive state, event handlers, effects, browser APIs, client context, or a client-only library. Place that boundary as low as practical instead of turning an entire route or design system into client code.

Use these component responsibilities for a substantial interactive screen:

- the route entrypoint selects the screen and supplies route parameters;
- a feature-owned Server Component composes server rendering, Suspense boundaries, and browser-safe initial data;
- an optional Client Component controller owns client state, events, mutations, browser-only effects, and client cache integration;
- pure UI leaves receive data and callbacks and do not import trusted modules, query clients, Server Actions, or persistence details;
- reusable loading, empty, not-found, and error presentation lives with the owning UI while thin framework fallbacks compose it.

Each data-backed screen selects one coherent initial-render mode:

- awaited server rendering when the response should wait for required data;
- streamed server rendering with a meaningful Suspense fallback when independent content can progressively appear;
- client-pending rendering when the product intentionally fetches after hydration.

TanStack Query hydration is optional and is used only when the client needs its cache, refetch, mutation, offline, or freshness behavior. When selected, server prefetch, dehydration, client query mode, and error behavior form one consistent path. An external error boundary can handle query failures only when the chosen query mode throws them, such as Suspense queries or an explicit `throwOnError`; otherwise the controller renders the error state itself.

Request-time rendering APIs are called only when the route actually depends on request-time state or intentionally opts out of prerendering. Static or cached screens do not call them unconditionally. Root and segment fallbacks follow Next.js requirements; a root global error renders the required document shell.

Small or static screens may collapse layers when each remaining file has one clear role. The repository does not create a hydrated wrapper, controller, hook, or fallback solely to satisfy an example shape.

## Invariants

- App Router entrypoints remain thin and contain no reusable product, persistence, or domain policy.
- Server Components are used unless a concrete client capability requires a client boundary.
- Client Components cannot import trusted or server-only modules, directly or transitively.
- Props crossing the server/client boundary are browser-safe and serializable for the selected framework contract.
- A screen uses one explicit initial-render and error-handling mode.
- Suspense and retry boundaries wrap work that can actually suspend or throw into them.
- Request-time APIs are evidence-driven, not boilerplate.
- Pure UI leaves are independently renderable from props and callbacks.

## Conflict resolution

When interactivity and server-only access appear in the same component, split the trusted server work from the smallest interactive client boundary rather than moving secrets or clients into the browser. When caching or rendering requirements conflict, select the mode that satisfies the route's product and freshness contract and record any durable exception. Framework requirements override stale examples and trigger a Guide update or successor decision when the durable model changes.

## Failure handling

Treat a client-reachable trusted import or sensitive prop as blocking. If loading or error UI cannot observe the selected request path, stop and align query mode, Suspense, and error handling before claiming the route resilient. If a request-time API unintentionally makes a route dynamic, remove it or document and validate the intended dynamic behavior. Preserve existing route behavior during structural refactors unless a behavior change is separately approved.

## Acceptance criteria

- Representative route and fallback files delegate to feature-owned components or server modules.
- Client boundaries have a concrete capability reason and do not pull trusted dependencies into their graph.
- Browser-bound props contain no secret, privileged client, or internal operational error detail.
- Initial render, loading, Suspense, query hydration, error, and retry behavior are tested as one selected mode.
- Static or cached routes do not use request-time APIs without a documented reason.
- Simple screens avoid ceremonial layers while substantial screens keep responsibilities distinct.

## Consequences

Some features use fewer files than a standard template and others retain an explicit server/controller/UI split. The result minimizes client JavaScript, makes data and error behavior observable, and prevents framework entrypoints from becoming product-logic owners.
