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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Separate process bootstrap, runtime composition, transports, services, start, readiness, and reverse-order cleanup.

Variants: **Short** · [Long, canonical](ac-adr-011-compose-long-running-backend-runtimes-and-lifecycles-explicitly.long.md) · [Guide](ac-adr-011-compose-long-running-backend-runtimes-and-lifecycles-explicitly.guide.md)

## Decision summary

- `main` is process bootstrap only: compose the runtime, bind transports, register shutdown, start loops, and set the process outcome.
- A runtime composition root receives resolved environment, validates app config, constructs shared dependencies and services in dependency order, and exposes explicit `start`, readiness, and `close` behavior.
- HTTP apps, routes, consumers, and jobs receive narrowed dependencies. They do not create hidden singleton clients or import an initialized service registry.
- Shared runtime packages own genuinely cross-app transport behavior, not app config, topics, clients, or domain services.
- Liveness reports that the process runs; readiness reflects whether it can safely serve work. Startup failure and partial construction trigger cleanup.
- Cleanup is idempotent, bounded, and runs in reverse dependency order. New work stops before in-flight work and dependencies are drained.
- Prefer transparent manual composition. Adopt a dependency-injection container only when lifecycle or graph complexity justifies its operational and debugging cost.

Use [AC-ADR-012](ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.short.md) ([Long, canonical](ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.long.md) · [Guide](ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.guide.md)) for configuration and [AC-ADR-023](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.short.md) ([Long, canonical](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.long.md) · [Guide](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.guide.md)) for operational controls.
