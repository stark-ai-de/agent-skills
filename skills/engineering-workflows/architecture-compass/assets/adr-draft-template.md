# ADR NNNN: Reusable Repository Source Structure

Date: YYYY-MM-DD

## Status

Proposed

## Context

This repository needs durable source-structure rules so contributors and agents can place code by role and runtime boundary instead of copying ad hoc patterns.

The goal is to keep framework entrypoints thin, keep business behavior behind named modules, separate browser-safe code from trusted server-only code, keep shared packages intentional, make backend runtime composition explicit, and keep validation/documentation aligned with source-shape policy.

## Requirements

- Keep framework entrypoints thin and make business behavior live behind named modules.
- Keep React components, hooks, pure TypeScript modules, server-only modules, API Route Handlers, and Server Actions in predictable locations.
- Keep browser-safe code separate from code that imports secrets, cookies, service-role clients, filesystem access, queues, WebSocket servers, or long-running process resources.
- Keep reusable UI, design tokens, provider wiring, and app-consumed styling in a shared UI package when the repository has shared UI.
- Keep reusable domain contracts and pure business rules in shared packages when more than one app or service needs them.
- Keep long-running backend services explicit: process bootstrap, runtime composition, HTTP app creation, service construction, lifecycle, and route plugins each have a clear owner.
- Keep environment loading and validation explicit at each application boundary.
- Keep deployment and infrastructure artifacts separate from runtime source code.
- Keep public exports intentional and avoid pass-through barrels that only shorten import paths.

## Decision

Adopt a role-first source structure with explicit runtime boundaries.

### Workspace ownership

- `apps/<web-app>` owns the primary web application: routes, app-specific composition, product screens, Route Handlers, Server Actions, browser hooks, and app-local modules.
- `apps/<docs-app>` owns documentation and the ADR catalog when a docs app exists.
- `apps/<worker-or-service>` owns long-running backend processes.
- `packages/ui` owns shared UI primitives, reusable components, design tokens, provider wiring, assets, global styles, and app-consumed styling utilities.
- `packages/<domain-core>` owns browser-safe and backend-agnostic domain contracts, schemas, normalization, rendering helpers, and pure business rules reused across apps or services.
- `packages/backend-runtime` owns app-agnostic backend process helpers only.
- `packages/<tooling>` owns reusable repository tooling.

Reusable code moves into packages only when a real second caller, public package boundary, or stable shared contract exists. App-specific behavior stays in the app.

### App source roles

Inside `apps/<web-app>/src`, use:

- `app` for framework entrypoints only.
- `components` for React component implementations only.
- `hooks` for React hooks.
- `lib` for app-local non-component TypeScript modules.
- `lib/server-only` for trusted server code, with a server-only sentinel in every hand-written file when supported.
- `lib/queries` for query contracts, key definitions, client/server query options, cache helpers, and query defaults.
- `lib/search-params` for typed URL state parsers and serializers when URL state affects application behavior.

Do not put component implementations in `lib`. Do not put pure data shaping, registries, constants, validators, or helper functions in `components` just because the first caller is a component.

### Request boundaries

Read paths use API routes plus query contracts by default. Write paths use validated Server Actions when browser interactions mutate trusted state. Alternative request adapters require a documented reason.

### Backend runtime

Dedicated backend apps split process bootstrap, runtime composition, HTTP app creation, route plugins, service construction, lifecycle, and config validation into explicit files.

### Environment and infrastructure

Each deployable app owns its env contract. Env file loading is a bootstrap concern. Runtime code receives parsed config explicitly. Infrastructure artifacts live outside runtime `src` trees.

### Exports

Use named exports. Avoid app-internal pass-through barrels unless they preserve a public package interface, runtime boundary, or useful locality boundary.

### Validation

Document source-shape rules first, report drift next, and promote stable rules to hard validation only after exceptions are small and intentional.

## Consequences

- New files have a clearer default home based on role and runtime boundary.
- Browser-safe code is less likely to import trusted server resources.
- Shared packages become easier to reuse because exports are intentional contracts.
- Backend startup, lifecycle, and tests keep explicit seams.
- Some feature-local code is split across route, component, hook, library, and server-only folders. This is intentional because runtime boundaries matter more than colocating every layer under one feature folder.
- Maintaining this structure requires docs and source-shape checks to evolve with the codebase.

## Alternatives considered

### Flat app-local structure

Rejected. It is fast at first but makes runtime boundaries ambiguous and invites generic utility dumping grounds.

### Feature folders owning every layer

Rejected as the default. Feature locality can be useful, but mixing routes, components, hooks, server-only code, and reusable contracts under one tree makes runtime boundaries harder to enforce.

## Follow-up

- Keep agent instructions, stack rules, architecture docs, and ADR indexes aligned with this ADR.
- Add source-shape reporting only after repeated drift is understood.
- Keep allowlist entries explicit with path, reason, owner, and removal condition.
