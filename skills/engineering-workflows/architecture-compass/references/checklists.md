# Checklists

## Setup checklist

- [ ] The top-level action is `setup`.
- [ ] Existing ADR paths and docs conventions were discovered before creating new files.
- [ ] `AGENTS.md` or the repo's equivalent agent-instruction file tells agents to treat accepted ADRs as binding.
- [ ] ADR discovery paths are listed.
- [ ] ADR precedence and conflict handling are documented.
- [ ] Bundled ADR guardrails from `assets/setup-report-template.md` are listed with `adopt`, `adapt`, `defer`, or `reject`.
- [ ] Adapted guardrails state the active adapted rule.
- [ ] Deferred guardrails have a future trigger or owner condition.
- [ ] Rejected guardrails have a user-confirmed rationale.
- [ ] Existing ADR-linked examples are referenced instead of copied wholesale.
- [ ] `docs/adr/index.md` or the repo's ADR index convention lists active decisions by area.
- [ ] Stack rules are created or updated only when the repo has a policy or the user provided one.
- [ ] PR checklist is added only when useful and consistent with repo convention.
- [ ] Future prompts for setup and refactor mode are included in the setup report.
- [ ] Open decisions are explicit.
- [ ] Validation commands are identified or marked `unspecified`.

## Source-role checklist

For every new or moved file, identify one primary role:

- [ ] App Router or framework entrypoint.
- [ ] React component.
- [ ] React hook.
- [ ] Browser-safe domain module.
- [ ] Server-only module.
- [ ] Query contract.
- [ ] Client query option factory.
- [ ] Server query option factory.
- [ ] Server Action.
- [ ] Backend process bootstrap.
- [ ] Backend runtime composition.
- [ ] Backend HTTP app factory.
- [ ] Backend route plugin.
- [ ] Backend service.
- [ ] Config/env module.
- [ ] Shared UI package module.
- [ ] Domain-core package module.
- [ ] Tooling package module.
- [ ] Infrastructure artifact.
- [ ] Test, fixture, or generated file.
- [ ] Docs or ADR.

If a file has multiple unrelated roles, split it unless the target repo has a documented exception.

## Runtime-boundary checklist

- [ ] Browser code does not import server-only modules, secrets, service-role clients, filesystem access, token signing, or trusted runtime clients.
- [ ] Every hand-written server-only file under a server-only path imports the required sentinel when the framework supports it.
- [ ] Server-only facades exist only when they preserve a runtime boundary or useful locality.
- [ ] Shared packages stay browser-safe or backend-agnostic unless a server-only subpath is explicit.
- [ ] Backend runtime packages do not import app-specific clients, topics, services, or config.

## Next.js implementation checklist

- [ ] Route files are thin and delegate.
- [ ] `loading.tsx`, `error.tsx`, `global-error.tsx`, and `not-found.tsx` compose fallback UI instead of owning product behavior.
- [ ] Screen wrapper installs `Suspense` and retry error boundary when needed.
- [ ] Hydrated server component prefetches server query options and renders an RCC inside a hydration boundary.
- [ ] Client controller owns hooks, client state, mutations, cache updates, browser-only effects, and event handlers.
- [ ] Pure UI leaves receive props and do not import persistence details.
- [ ] Query keys and endpoint strings live in a query contract.
- [ ] Client query options call API endpoints through a fetch helper.
- [ ] Server query options call trusted server-only helpers directly with the same query key.
- [ ] Server Actions validate unknown input, authenticate through a server-only wrapper, call command modules, and return typed results.

## Backend service checklist

- [ ] `main.ts` loads env files before runtime creation.
- [ ] `main.ts` creates runtime, HTTP app, listener, signal handlers, shutdown coordination, and starts runtime loops.
- [ ] `runtime.ts` validates config, creates logger, clients, services, readiness, lifecycle, and cleanup.
- [ ] `http-app.ts` creates the HTTP app from an existing runtime and does not call `.listen()`.
- [ ] Route files are plugin factories and receive runtime or narrowed dependencies explicitly.
- [ ] Services are constructed in dependency order through `services/create-services.ts`.
- [ ] Service registry types live in `services/types.ts`.
- [ ] Lifecycle helpers close closeable services in reverse registry order.
- [ ] Service files export classes, dependency interfaces, and types, not initialized singletons.
- [ ] Framework context does not leak into domain services.

## Env/config checklist

- [ ] Each deployable app owns its env contract.
- [ ] Next.js env module separates server, client, and shared schemas.
- [ ] Public browser values follow the framework’s public-prefix convention.
- [ ] Server secrets are consumed only from server-only modules.
- [ ] Backend env files load in process bootstrap before runtime creation.
- [ ] Config modules export parser functions and types.
- [ ] Runtime code receives parsed config explicitly.
- [ ] Service, route, and domain modules do not load env files.
- [ ] Avoid eager env singletons in backend workers.

## Export/import checklist

- [ ] Named exports are used.
- [ ] Components, hooks, services, and substantial modules have one primary value export where practical.
- [ ] Types and tiny type-adjacent helpers are grouped only when the combined file is easier to scan.
- [ ] App-internal pass-through barrels are removed unless they preserve a public package interface, runtime boundary, or useful locality.
- [ ] Public package export maps remain intentional.

## Stack checklist

- [ ] Target stack rules were inspected before the optional stack profile was applied.
- [ ] Existing stack and built-in platform capabilities were considered first.
- [ ] Preferred libraries were used when they fit.
- [ ] Any deviation names the preferred option, why it was insufficient, and whether docs need an update.

## Documentation checklist

- [ ] Existing ADRs remain accurate or a superseding ADR is proposed.
- [ ] ADR index is updated when an ADR is added.
- [ ] Architecture summary links to the canonical ADR instead of duplicating policy.
- [ ] Agent instructions mention the durable rule only when future agents need it.
- [ ] Stack rules include deviations only when they become repeated patterns.
- [ ] Missing docs or directories were not created without approval.

## Validation checklist

- [ ] Target repo validation commands were identified.
- [ ] Type-check or test for the touched package/app was run when available.
- [ ] Source-shape report was run when available.
- [ ] Docs validation was run after docs/ADR changes when available.
- [ ] Skipped validation has a reason.
- [ ] Remaining risks are stated.
