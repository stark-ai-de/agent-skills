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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Separate process bootstrap, runtime composition, transports, services, start, readiness, and reverse-order cleanup.

Variants: [Short](ac-adr-011-compose-long-running-backend-runtimes-and-lifecycles-explicitly.short.md) · [Long, canonical](ac-adr-011-compose-long-running-backend-runtimes-and-lifecycles-explicitly.long.md) · **Guide**

## Implementation guide

This guide is non-normative. Adapt names and framework APIs to the target repository.

### Suggested deployable shape

```text
src/main.ts
src/config.ts
src/runtime.ts
src/http-app.ts
src/routes/
src/services/create-services.ts
src/services/types.ts
src/runtime/lifecycle.ts
```

Expose one `createRuntime(resolvedEnv)` that returns typed config, logger, narrowed services, `start()`, `getReadiness()`, and `close()`. Let `createHttpApp(runtime)` register routes without calling `listen`. Let `main.ts` bind the listener, register one guarded shutdown function, then start loops in the order defined by the runtime.

Elysia is one suitable HTTP framework when its runtime and host compatibility are proven. Use its Node adapter only for a Node target that requires it; do not add it to a Bun-owned process by habit. The same composition split applies to Fastify, Hono, Express, native servers, queue workers, and scheduled processes.

Implement a small close-stack helper or explicit close sequence. Register a cleanup immediately after a resource becomes owned, and unwind it if later construction fails. Apply timeouts to drain and cleanup, but retain enough error context to diagnose which resource failed without logging secrets.

Readiness may aggregate required checks with short timeouts and stable names. Keep `/healthz` cheap; return a non-success status from `/readyz` when the instance must leave traffic. Avoid returning credentials, raw provider errors, or internal topology in either response.

### Suggested tests

- Use call-order spies to prove start and cleanup order.
- Simulate failure at client, service, listener, and subscription initialization.
- Send two termination signals and assert cleanup runs once.
- Start an in-flight request or job, initiate shutdown, and prove bounded drain behavior.
- Import route and shared-runtime modules in a test and assert no listener or client is created.

## Official sources

- [Node.js: Process signal events](https://nodejs.org/api/process.html#signal-events)
- [Node.js: HTTP server close](https://nodejs.org/api/http.html#serverclosecallback)
- [Bun: HTTP server lifecycle](https://bun.sh/docs/api/http)
- [Elysia: Lifecycle](https://elysiajs.com/essential/life-cycle)
- [Kubernetes: Liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
