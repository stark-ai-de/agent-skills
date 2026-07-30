# Backend Runtime Patterns

Use this reference when creating or refactoring long-running backend apps, worker processes, service runtimes, and app-agnostic backend runtime packages.

## Backend runtime package boundary

`packages/backend-runtime` exposes app-agnostic HTTP helpers through a stable package export such as `@repo/backend-runtime/elysia`, adapted to the target repo’s package naming convention. Backend apps use these helpers from their `http-app.ts` file after the app runtime has already been created.

The package owns cross-cutting HTTP behavior such as:

- request ID derivation,
- sanitized error handling,
- optional request logging,
- health and readiness routes,
- framework base app creation.

It must not own app-specific clients, topics, service instances, config parsing, or domain behavior.

## Shared HTTP base

The default starter runtime is Bun. Do not add the Elysia Node adapter unless the target repo has a Node.js runtime ADR, deployment host requirement, or dependency compatibility reason.

Generic shape:

```ts
import { randomUUID } from "node:crypto";

import { Elysia } from "elysia";

export interface BackendElysiaOptions {
  logger: Pick<typeof console, "error" | "info" | "warn">;
  logRequests?: boolean;
  name: string;
  requestIdHeader?: string;
  serviceName?: string;
}

const defaultRequestIdHeader = "x-request-id";

function getBackendPluginOptions(options: BackendElysiaOptions) {
  return {
    ...options,
    requestIdHeader: options.requestIdHeader ?? defaultRequestIdHeader,
    serviceName: options.serviceName ?? options.name,
  };
}

export function createRequestIdPlugin(options: { name: string; requestIdHeader: string }) {
  return new Elysia({ name: `${options.name}.request-id` }).derive(
    { as: "scoped" },
    ({ request, set }) => {
      const requestId = request.headers.get(options.requestIdHeader) ?? randomUUID();
      set.headers[options.requestIdHeader] = requestId;
      return { requestId };
    },
  );
}

export function createBackendElysiaApp(options: BackendElysiaOptions) {
  const pluginOptions = getBackendPluginOptions(options);

  return new Elysia({ name: options.name })
    .use(createRequestIdPlugin(pluginOptions))
    .use(createErrorHandlingPlugin(pluginOptions))
    .use(createLoggingPlugin(pluginOptions));
}
```

Keep app-specific response models, clients, services, topics, and config out of this package.

For a target repo that has adopted Node.js for backend services, use the documented Elysia Node adapter in this shared HTTP base and record the runtime reason in the repo ADR or stack rules.

## Health and readiness routes

Health routes are explicit plugins:

```ts
import { Elysia } from "elysia";

export function createBackendHealthRoutes(input: {
  getReadiness: () => { ok: boolean; checks: Record<string, unknown> };
  serviceName: string;
}) {
  return new Elysia({ name: `${input.serviceName}.health` })
    .get("/healthz", () => ({ ok: true, serviceName: input.serviceName }))
    .get("/readyz", ({ status }) => {
      const readiness = input.getReadiness();
      return readiness.ok ? readiness : status(503, readiness);
    });
}
```

## App `http-app.ts`

The backend app creates an HTTP app from an already-created runtime. It does not create clients, services, or listeners and does not call `.listen()`.

```ts
import { createBackendElysiaApp } from "@repo/backend-runtime/elysia";

import { createBackendServiceHealthRoutes } from "./routes/health.routes";
import type { BackendServiceRuntime } from "./runtime";

export function createBackendServiceHttpApp(runtime: BackendServiceRuntime) {
  return createBackendElysiaApp({
    logger: runtime.logger,
    name: "backend-service.http",
    serviceName: "backend-service",
  }).use(createBackendServiceHealthRoutes(runtime));
}

export { createBackendServiceHttpApp as createHttpApp };
```

## Process bootstrap `main.ts`

`main.ts` is process bootstrap. It runs after the target repo's Bun command has selected env-file behavior, creates the runtime, creates the HTTP app, starts listening, registers signal handlers, coordinates shutdown, and then starts runtime loops. It does not contain business logic or create individual services.

```ts
import { createHttpApp } from "./http-app";
import { createRuntime } from "./runtime";

const runtime = await createRuntime();
const app = createHttpApp(runtime);
const server = app.listen(runtime.config.PORT);
let shuttingDown = false;

runtime.logger.info(`backend-service listening on port=${runtime.config.PORT}`);

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  runtime.logger.info(`backend-service shutting down signal=${signal}`);

  try {
    try {
      await server.stop();
    } finally {
      await runtime.close();
    }
    process.exit(0);
  } catch (error) {
    runtime.logger.error(`backend-service shutdown failed signal=${signal}`, error);
    process.exit(1);
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await runtime.start();
```

## Runtime composition `runtime.ts`

`runtime.ts` is the composition root. It validates config, creates the logger, creates external clients, creates the service registry, starts runtime loops or subscriptions, owns readiness, and owns cleanup.

```ts
import { loadBackendServiceConfig, type BackendServiceConfig, type RuntimeEnv } from "./config";
import { createRuntimeLifecycle } from "./runtime/create-runtime-lifecycle";
import { createServices } from "./services/create-services";
import type { BackendServiceServices, Logger } from "./services/types";

export interface BackendServiceRuntime {
  close(): Promise<void>;
  config: BackendServiceConfig;
  getReadiness(): { ok: boolean; checks: Record<string, unknown> };
  logger: Logger;
  services: BackendServiceServices;
  start(): Promise<void>;
}

function createLogger(): Logger {
  return console;
}

export async function createRuntime(
  runtimeEnv: RuntimeEnv = process.env,
): Promise<BackendServiceRuntime> {
  const config = loadBackendServiceConfig(runtimeEnv);
  const logger = createLogger();
  const services = createServices({ config, logger });
  const lifecycle = createRuntimeLifecycle({ config, logger, services });

  return {
    config,
    logger,
    services,
    ...lifecycle,
  };
}
```

## Services

Required split:

- `services/create-services.ts` constructs services in dependency order.
- `services/types.ts` owns the service registry interface.
- `services/lifecycle.ts` or equivalent lifecycle helpers close closeable services in reverse registry order.
- `services/<name>.service.ts` files export named service classes, dependency interfaces, and types. They do not export initialized singleton instances.

Pure parsing, validation, mapping, formatting, and small calculations stay outside `services` in domain folders or next to the narrow contract they serve.

## Route plugins

`routes/*` files are plugin factories. They receive runtime or narrowed service dependencies explicitly. They do not import initialized service instances.

```ts
import { Elysia } from "elysia";

import type { BackendServiceRuntime } from "../runtime";

export function createBackendServiceHealthRoutes(runtime: BackendServiceRuntime) {
  return new Elysia({ name: "backend-service.health" })
    .get("/healthz", () => ({ ok: true }))
    .get("/readyz", ({ status }) => {
      const readiness = runtime.getReadiness();
      return readiness.ok ? readiness : status(503, readiness);
    });
}
```

Framework context stays inside route handlers. Handlers destructure only route values they need and pass plain domain inputs into services. Domain services do not accept broad framework objects.

## Config validation

Config modules export parsing functions and config types. Runtime code receives parsed config explicitly instead of scattered `process.env` reads.

```ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export type RuntimeEnv = NodeJS.ProcessEnv;

function getRuntimeEnv(env: RuntimeEnv) {
  return {
    ...env,
    PORT: env.SERVICE_PORT || env.PORT,
  };
}

export function loadBackendServiceConfig(env: RuntimeEnv = process.env) {
  return createEnv({
    emptyStringAsUndefined: true,
    server: {
      PORT: z.coerce.number().int().positive().default(4311),
      SERVICE_API_KEY: z.string().min(1),
      SERVICE_URL: z.string().url(),
    },
    runtimeEnv: getRuntimeEnv(env),
  });
}

export type BackendServiceConfig = ReturnType<typeof loadBackendServiceConfig>;
```

## Env file loading

Backend workers are Bun processes by default. Bun loads `.env` files automatically unless disabled, so target repos should make env-file policy explicit in package scripts, process-manager commands, or deployment config before `main.ts` runs.

```json
{
  "scripts": {
    "dev": "bun --env-file=.env.development.local --watch src/main.ts",
    "start": "bun --no-env-file src/main.ts"
  }
}
```

Env file selection is a deployable-app concern. Service modules, route modules, and domain modules must not load env files or read scattered environment variables. Runtime code receives parsed config explicitly.

## Dependency injection policy

Manual constructor and factory injection remains the default dependency-injection model. If manual composition stops scaling, first add typed local composition helpers that still return the explicit service registry. If an external DI container becomes justified, prefer an explicit app-local container. Decorator or metadata-based containers are allowed only with a documented reason because they add reflection or decorator coupling. A DI container must be created only in the composition root, preserve explicit lifecycle cleanup, and must not turn `packages/backend-runtime` into an application service container.
