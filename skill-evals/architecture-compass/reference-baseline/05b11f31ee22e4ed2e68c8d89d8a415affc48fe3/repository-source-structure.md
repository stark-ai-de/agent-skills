# Repository Source Structure Rules

This reference defines the reusable source-structure pattern. Apply it only when compatible with target-repository ADRs, stack rules, and framework choices.

## Quality goals

- **Locality:** a change should usually touch the route, component, hook, module, adapter, or service that owns the concept instead of many unrelated files.
- **Runtime safety:** browser bundles must not receive server secrets or long-running runtime dependencies.
- **Testability:** domain modules, services, route wrappers, and pure helpers should be testable through their public interfaces with fake dependencies.
- **Navigation:** agents and developers should infer where a new file belongs from its role and runtime boundary.
- **Portability:** reusable package code should stay browser-safe or backend-agnostic unless the package submodule is explicitly server-only.
- **Low ceremony:** shallow wrappers are removed unless they define a real interface, runtime boundary, public package entrypoint, or useful locality boundary.

## Top-level workspace ownership

- `apps/<web-app>` owns the primary Next.js product application: routes, app-specific composition, product screens, Route Handlers, Server Actions, browser hooks, and app-local modules.
- `apps/<docs-app>` owns the documentation site and ADR catalog when a docs app exists.
- `apps/<worker-or-service>` owns long-running backend processes that are not a good fit for a serverless or route-handler boundary.
- `packages/ui` owns shared UI primitives, reusable components, design tokens, provider wiring, assets, global styles, and app-consumed styling utilities.
- `packages/<domain-core>` owns browser-safe and backend-agnostic domain contracts, schemas, normalization, rendering helpers, and pure business rules reused across apps or services.
- `packages/backend-runtime` owns app-agnostic backend process helpers only, such as the shared HTTP base, health responses, request IDs, and sanitized HTTP error handling.
- `packages/<tooling>` owns reusable repo tooling that is not product runtime code.

Reusable code moves into packages only when a real second caller, public package boundary, or stable shared contract exists. App-specific behavior stays in the app.

## Next.js app structure

Inside `apps/<web-app>/src`:

- `app` contains App Router entrypoints only. `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `route.ts`, `template.tsx`, `default.tsx`, metadata/static route files such as `robots.ts`, `sitemap.ts`, `manifest.ts`, `icon.*`, `opengraph-image.*`, and `twitter-image.*`, and route-local `actions.ts` should be thin framework files that delegate to components or server-only modules.
- `components` contains React component implementations only. Product component folders may group a screen’s server wrapper, client controller, and pure UI leaves, but non-component logic moves out.
- `hooks` contains React hooks, with one hook per file for substantial hooks.
- `lib` contains app-local TypeScript modules that are not React components: domain contracts, DTO mapping, validators, query contracts, date/time helpers, search-param definitions, route constants, adapters, and server-only modules.
- `lib/server-only` contains trusted server code. Every hand-written file in this folder and its subfolders imports `server-only`. This tree owns code that reads cookies, signs tokens, uses service-role clients, accesses secrets, or performs trusted server persistence.
- `lib/<domain>` contains browser-safe or isomorphic domain modules for one app domain. Create a domain folder when there is a group of related files; keep single modules such as `env.ts`, `text-constants.ts`, or `routes/app-paths.ts` direct when a folder would only add ceremony.
- `lib/queries` contains TanStack Query contracts, key definitions, client query option factories, server query option factories, cache update helpers, and shared query defaults.
- `lib/search-params` contains typed URL state parsers and serializers when URL state affects application behavior.
- Generated database types or equivalent generated files are treated as generated exceptions, not hand-written domain modules.

Do not put `*.tsx` component implementations in `lib`. Do not put pure data shaping, registries, constants, validators, or helper functions in `components` just because the first caller is a component.

Segment `error.tsx` files handle recoverable route-segment errors and should delegate to reusable fallback UI. Root `global-error.tsx` handles root layout or template failures and must render the full document shell required by the framework. `not-found.tsx` handles explicit not-found conditions and unmatched-route UX where appropriate. These framework-owned fallback files stay thin; reusable fallback components live in `components`.

## Server and client component split

For substantial data-backed screens, use this split when the target stack is Next.js with TanStack Query:

- The route `page.tsx` imports a named screen component and stays small.
- The screen component installs `Suspense` and a retry error boundary.
- A feature-specific hydrated server component, named `Hydrated<Feature>` or `<Feature>Hydrated` by local convention, calls request-time rendering helpers only when required, creates the TanStack Query client, prefetches server query options, dehydrates state, and renders a client controller inside a hydration boundary.
- The React Client Component controller owns client-only state, hooks, mutations, query cache updates, browser-only effects, and user interaction wiring.
- Pure UI components receive props and render the screen without owning server calls, service clients, or domain persistence rules.

Use `"use client"` only in the client controller or leaf modules that need hooks, browser APIs, event handlers, context, or client-only libraries. Shared UI components that need those features declare `"use client"` at their own module boundary so direct imports from Server Components remain valid.

## Reads, writes, and request boundaries

Read paths use API routes plus TanStack Query by default:

- A `route.ts` file delegates to a server-only route wrapper or authenticated JSON route helper.
- Server-only read modules load the current session, call trusted adapters, validate selected rows, map database rows to DTOs, and return browser-safe data.
- The shared query contract owns query keys and browser API endpoint strings.
- Client query option factories call the API route through a small fetch helper.
- Server query option factories call the trusted server-only helper directly while using the same query key and default option shape.
- Query defaults live in one TanStack helper so freshness, retries, polling, and caller override behavior stay consistent.

Write paths use validated Server Actions when a browser interaction mutates trusted state:

- Route-local `actions.ts` files declare `"use server"` and export named action functions.
- Each action parses unknown input through Zod or another selected validation contract.
- Each action authenticates through a shared server-only wrapper before calling command modules.
- Command modules live under `lib/server-only/<domain>` when they need trusted persistence, secrets, or service-role clients.
- Actions return typed result objects rather than leaking raw operational errors to the client.
- Client mutation hooks call those actions and own required query cache updates while still composing caller-provided lifecycle callbacks.

When a write is better modeled as an HTTP API, keep the `route.ts` handler thin and delegate the real behavior to a server-only route module.

Optional request adapters such as tRPC or GraphQL may be added only when they materially improve a set of endpoints. Realtime subscriptions may be layered on top as a freshness overlay; they do not replace trusted reads or writes.

## Server-only module boundaries

Every module under a Next.js app’s `lib/server-only` path imports `server-only`, including modules in subfolders. The sentinel is required because a path name alone does not prevent accidental browser imports.

Modules that import server secrets, cookie policy, token signing, service-role clients, filesystem access, or trusted runtime clients must live under an explicit server-only path when they are part of the Next.js app.

Server-only domain modules may expose a small interface to Route Handlers, Server Actions, and server query options. They should keep store queries, selected-column strings, table/RPC details, and DTO mapping private unless more than one real adapter or caller justifies a public seam.

Server-only facades can be retained even when they look shallow if they enforce a runtime boundary or prevent accidental browser imports. A wrapper that only renames another browser-safe helper should be removed unless it improves locality for several callers.

## Shared package boundaries

`packages/ui` is the shared design-system and styling boundary:

- Components, provider modules, hooks, utilities, assets, global styles, and primitive helper re-exports are exposed through package subpaths.
- Apps consume stable UI package exports instead of private package source paths.
- Shared component registry output lands in the package, not in each app.
- Tailwind tokens, global styles, PostCSS configuration, theme providers, and reusable component variants live in the package.
- Direct app imports from low-level UI primitive libraries are avoided unless the composition is intentionally app-local.

`packages/<domain-core>` packages are pure contract packages:

- They may export package-level barrels and subpath entrypoints because those define public package interfaces.
- They should not import Next.js, app-local aliases, service-role clients, process bootstrap code, or app-specific runtime configuration.
- Internal folders group schemas, normalization, rendering helpers, and narrow domain calculations behind stable package exports.

`packages/backend-runtime` remains app-agnostic:

- It owns common backend HTTP behavior and route helpers.
- It must not construct app services, import app domains, own app-specific topics, or act as a dependency-injection container.

## Environment loading and validation

Each deployable app owns its own environment contract:

- Next.js apps use a single app-local env module with separate server, client, and shared schemas. Browser-visible values must use the framework’s public-prefix convention; server secrets stay in the server schema and are consumed only from server-only modules.
- Backend worker apps load local env files in `main.ts` before creating the runtime, then validate the resolved runtime env through an app-local config module in `runtime.ts`.
- Config modules export parsing functions and config types. Runtime code receives parsed config explicitly instead of reading scattered `process.env` values.
- Env file loading is a bootstrap concern. Service modules, route modules, and domain modules must not load env files.
- Eager env singletons are discouraged for backend workers because they make import order part of runtime behavior. Use explicit config or dependency parameters instead.

## Infrastructure and deployment files

Pure infrastructure artifacts are not application source modules:

- Dockerfiles, Docker Compose files, Kubernetes manifests, Helm charts, Terraform/OpenTofu modules, and deployment overlays live outside `src`.
- App-specific deployment artifacts may live next to the deployable app when they only build or deploy that app.
- Cross-app or environment-wide infrastructure lives in a root infrastructure tree such as `infra/*`, `deploy/*`, or `ops/*`.
- Reusable infrastructure generation or validation scripts may live in `packages/<tooling>` or `scripts`, but runtime packages such as `packages/ui`, `packages/<domain-core>`, and `packages/backend-runtime` must not own deployment manifests.
- Generated manifests or vendored chart output should be clearly separated from hand-written source and documented with generation commands.

## Export and import policy

Use named exports. Prefer one primary value export per source file for components, hooks, services, and substantial modules. Related types and tiny type-adjacent helpers may stay together when the combined file remains easier to scan than several one-line files.

Avoid app-internal pass-through barrels and direct-import convenience wrappers. Use the deletion test:

- If deleting a wrapper makes ownership clearer and callers can import the owning module directly, delete it.
- If deleting a wrapper only pushes complexity elsewhere, breaks a public package interface, or removes a runtime boundary, keep it.
- Package export-map entrypoints, public API barrels, and server-only facades can be valid even when their implementation is shallow because they define a boundary rather than merely shortening an import path.

## Validation and documentation

New source-shape rules should first be documented, then reported, and only later promoted to hard validation once the allowlist is small and intentional.

Use focused validation for the touched boundary:

- Type-check and test the package or app being changed.
- Run source-shape reporting after structural cleanup when such reporting exists.
- Run docs validation after ADR and documentation changes.
- Update architecture docs when implementation details change, and update ADRs when durable decisions change.
