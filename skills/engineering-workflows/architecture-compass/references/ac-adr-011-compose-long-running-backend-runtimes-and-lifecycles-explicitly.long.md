# AC-ADR-011: Compose Long-Running Backend Runtimes and Lifecycles Explicitly

ID: AC-ADR-011
Title: Compose Long-Running Backend Runtimes and Lifecycles Explicitly
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: backend
Tags: backend, runtime, composition-root, dependency-injection, lifecycle, health, shutdown
Applies when: Creating or refactoring a worker, service, HTTP process, route plugin, service registry, or dependency-injection boundary.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Separate process bootstrap, runtime composition, transports, services, start, readiness, and reverse-order cleanup.

Variants: [Short](ac-adr-011-compose-long-running-backend-runtimes-and-lifecycles-explicitly.short.md) · **Long, canonical** · [Guide](ac-adr-011-compose-long-running-backend-runtimes-and-lifecycles-explicitly.guide.md)

## Context

Long-running services combine process concerns, configuration, clients, domain services, HTTP or message transports, background loops, health, and cleanup. When those responsibilities are constructed inside route files or hidden singletons, tests cannot control dependencies and shutdown order becomes accidental. A shared framework package can create a second form of coupling when it owns app-specific behavior.

## Decision

### Keep explicit composition layers

A deployable backend has four visible layers:

1. **Process bootstrap** binds the runtime to process signals and transports. It contains no domain behavior and does not construct individual services.
2. **Runtime composition** validates the already-resolved environment, creates logger/telemetry, external clients, services, lifecycle controllers, readiness checks, and their ownership graph.
3. **Transport composition** builds HTTP apps, routes, consumers, schedules, or job handlers from an already-created runtime or narrowed dependencies. Transport adapters translate framework values to plain domain inputs.
4. **Domain and application services** enforce behavior without depending on broad framework request/context objects.

Construction is explicit and follows dependency order. Initialized clients and service registries are not module-level exported singletons. Manual constructor or factory injection is the default because it keeps ownership and tests visible. A container is allowed only after documenting the complexity it solves, its scopes, disposal semantics, cycle behavior, and debugging path.

### Make ownership and lifecycle observable

The component that creates a resource owns its cleanup or transfers that ownership explicitly. Runtime creation either succeeds with a closeable runtime or cleans up every resource constructed before failure. `start` does not silently duplicate loops or subscriptions, and `close` is safe when called after partial startup or more than once.

Shutdown follows dependency and traffic flow:

- mark readiness false and stop accepting new work;
- stop schedules, subscriptions, consumers, and listeners that create work;
- allow bounded draining or cancellation of in-flight work;
- close services, external clients, telemetry, and other dependencies in reverse construction order;
- surface timeout or cleanup failure without hanging indefinitely.

Signal handlers coordinate this sequence once. Libraries never call `process.exit`; the process bootstrap chooses the final exit code after awaited cleanup.

### Separate liveness and readiness

Liveness answers whether the process and event loop are functioning. It does not perform a cascading dependency check that causes avoidable restarts. Readiness answers whether this instance can safely accept its assigned work and may include essential initialized-state or dependency checks with tight bounds. A runtime is not ready before required initialization and becomes not ready before shutdown.

### Keep shared runtime packages app-agnostic

Shared packages may provide stable request IDs, sanitized error handling, logging hooks, health route helpers, tracing, or framework base construction. They do not own app-specific configuration schemas, domain services, provider clients, topics, queues, response models, or initialized state. App adapters depend on stable package exports rather than private source paths.

## Consequences

Runtime ownership, testing, readiness, and shutdown become explicit. More small composition files are created, but app behavior is decoupled from frameworks and hidden singleton state is removed.

## Validation

- Unit-test services with explicit fakes and no process-global initialized registry.
- Prove deterministic construction and reverse cleanup order.
- Inject a failure after each initialization stage and verify previously created resources close.
- Exercise repeated `start`, repeated `close`, termination signals, bounded draining, and forced timeout.
- Verify readiness before startup, while healthy, after a required dependency failure, and during shutdown; liveness remains independent.
- Prove transport factories do not listen or create app clients as import-time side effects.
