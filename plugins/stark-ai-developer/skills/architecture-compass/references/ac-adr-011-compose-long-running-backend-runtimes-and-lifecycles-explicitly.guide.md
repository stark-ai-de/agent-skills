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
Guide verified: 2026-07-30
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

Expose one synchronous `prepareRuntimeAcquisition(config, bootstrapLogger)` ownership boundary. It returns a closeable adapter before external acquisition; bounded `.acquire(signal)` produces typed config, logger, narrowed services, `start(signal)`, `getReadiness()`, and `close(signal)`. Let `createHttpApp(runtime)` register routes without calling `listen`. Let `main.ts` construct and register one guarded shutdown function before it acquires the runtime, binds the listener, or starts loops, and invoke the transport factory only inside that same guarded startup boundary.

Elysia is one suitable HTTP framework when its runtime and host compatibility are proven. Use its Node adapter only for a Node target that requires it; do not add it to a Bun-owned process by habit. The same composition split applies to Fastify, Hono, Express, native servers, queue workers, and scheduled processes.

### Runtime composition with partial-start unwind

Keep dependency construction explicit, make acquisition, startup, and cleanup cancellable, and register cleanup before an external handle can be opened. Use a two-phase adapter: `prepareDatabaseAcquisition` is synchronous and side-effect-free, while its `acquire(signal)` may open the provider handle only after the caller already owns `close(signal)`. The same rule applies to queues, telemetry exporters, listeners, and every other external acquisition.

```ts
type Runtime = {
  config: Config;
  logger: Logger;
  services: Services;
  getReadiness(): Readiness;
  start(signal: AbortSignal): Promise<void>;
  close(signal: AbortSignal): Promise<void>;
};

function combineFailures(primary: unknown, cleanup: unknown, message: string): AggregateError {
  return new AggregateError([primary, cleanup], message, { cause: primary });
}

export function prepareRuntimeAcquisition(
  config: Config,
  bootstrapLogger: Logger,
): CloseableAcquisition<Runtime> {
  const closeStack: Array<(signal: AbortSignal) => Promise<void>> = [];
  // The returned Runtime exposes this same `close: once(...)` owner.
  const close = once((signal: AbortSignal) => closeReverse(closeStack, signal));

  return {
    acquire: (signal) => createRuntime(config, bootstrapLogger, signal, closeStack, close),
    close,
  };
}

async function createRuntime(
  config: Config,
  bootstrapLogger: Logger,
  signal: AbortSignal,
  closeStack: Array<(signal: AbortSignal) => Promise<void>>,
  close: (signal: AbortSignal) => Promise<void>,
): Promise<Runtime> {
  try {
    signal.throwIfAborted();

    // This owner and its disposer exist before createDatabase may open a
    // connection. acquire(signal) must reject and finish its own partial unwind
    // after abort; it may not publish a late, newly opened handle.
    const databaseOwner = prepareDatabaseAcquisition(config.database);
    closeStack.push((cleanupSignal) => databaseOwner.close(cleanupSignal));
    const database = await createDatabase(databaseOwner, signal);
    signal.throwIfAborted();

    const services = createServices({ database, clock: systemClock });
    const workers = createWorkers({ services });
    closeStack.push((cleanupSignal) => workers.close(cleanupSignal));

    return {
      config,
      logger: bootstrapLogger,
      services,
      getReadiness: () => workers.getReadiness(),
      start: (signal) => workers.start(signal),
      close,
    };
  } catch (primaryError) {
    try {
      await close(AbortSignal.timeout(config.abortGraceMs));
    } catch (cleanupError) {
      throw combineFailures(primaryError, cleanupError, "runtime acquisition and unwind failed");
    }
    throw primaryError;
  }
}

async function createDatabase(
  owner: CloseableAcquisition<Database>,
  signal: AbortSignal,
): Promise<Database> {
  return owner.acquire(signal);
}
```

Every acquire, `start(signal)`, bind, admission-stop, drain, and close adapter must observe its `AbortSignal`, stop creating work, unwind resources it acquired, and settle. A deadline that merely removes handlers or rejects a `Promise.race` is insufficient: the abandoned operation can still hold a socket, timer, worker, or client. `withDeadline` therefore aborts the operation, invokes its owner-specific cleanup, waits a second bounded interval for both to settle, and calls a bootstrap-owned terminal function when settlement or cleanup cannot be confirmed:

```ts
type Stage =
  | "runtime-acquire"
  | "runtime-start"
  | "listener-bind"
  | "startup-settlement"
  | "listener-stop-admission"
  | "listener-drain"
  | "listener-close"
  | "runtime-close";
type TerminalFailure = { stage: Stage; cause: unknown };
type Terminal = (failure: TerminalFailure) => never;

async function withDeadline<T>({
  stage,
  parentSignal,
  timeoutMs,
  abortGraceMs,
  operation,
  onAbort,
  terminal,
}: {
  stage: Stage;
  parentSignal: AbortSignal;
  timeoutMs: number;
  abortGraceMs: number;
  operation: (signal: AbortSignal) => Promise<T>;
  onAbort: () => Promise<void>;
  terminal: Terminal;
}): Promise<T> {
  const deadline = new AbortController();
  const timeoutError = new Error(`${stage} exceeded its deadline`);
  const signal = AbortSignal.any([parentSignal, deadline.signal]);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const operationOutcome = settle(Promise.resolve().then(() => operation(signal)));
  const timeoutOutcome = new Promise<StageAbort>((resolve) => {
    timer = setTimeout(() => {
      deadline.abort(timeoutError);
      resolve({ kind: "aborted", cause: timeoutError });
    }, timeoutMs);
  });

  try {
    const first = await Promise.race([
      operationOutcome,
      abortOutcome(parentSignal),
      timeoutOutcome,
    ]);

    if (first.kind === "fulfilled") return first.value;
    if (first.kind === "rejected" && !signal.aborted) throw first.cause;

    const abortCause = signal.reason ?? first.cause;
    const cleanupOutcome = settle(Promise.resolve().then(onAbort));
    const confirmation = await Promise.race([
      Promise.all([operationOutcome, cleanupOutcome]).then((outcomes) => ({
        kind: "confirmed" as const,
        outcomes,
      })),
      after(abortGraceMs).then(() => ({ kind: "unconfirmed" as const })),
    ]);

    if (confirmation.kind === "unconfirmed") {
      return terminal({ stage, cause: abortCause });
    }

    const [operationResult, cleanupResult] = confirmation.outcomes;
    const primaryFailure = operationResult.kind === "rejected" ? operationResult.cause : abortCause;
    if (cleanupResult.kind === "rejected") {
      return terminal({
        stage,
        cause: combineFailures(
          primaryFailure,
          cleanupResult.cause,
          `${stage} abort cleanup failed`,
        ),
      });
    }
    throw primaryFailure;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function closeOrTerminate(
  stage: "listener-close" | "runtime-close",
  close: (signal: AbortSignal) => Promise<void>,
  config: Config,
  terminal: Terminal,
): Promise<void> {
  const parent = new AbortController();
  let terminalInvoked = false;

  function invokeTerminalPreservingFailure(failure: TerminalFailure): never {
    terminalInvoked = true;
    try {
      return terminal(failure);
    } catch (terminalError) {
      throw combineFailures(
        failure.cause,
        terminalError,
        `${stage} cleanup failed and terminal escalation also threw`,
      );
    }
  }

  try {
    await withDeadline({
      stage,
      parentSignal: parent.signal,
      timeoutMs: config.shutdownTimeoutMs,
      abortGraceMs: config.abortGraceMs,
      operation: close,
      onAbort: async () => {},
      terminal: (failure) => invokeTerminalPreservingFailure(failure),
    });
  } catch (error) {
    if (terminalInvoked) throw error;
    return invokeTerminalPreservingFailure({ stage, cause: error });
  }
}

// These functions live in main.ts, not in a library. Tests inject a throwing
// terminator; the production bootstrap uses its host's synchronous hard-exit.
function terminalBootstrapFailure(failure: TerminalFailure): never {
  reportSanitizedTerminalFailure("bootstrap", failure);
  process.exit(1);
}

function terminalShutdownFailure(failure: TerminalFailure): never {
  reportSanitizedTerminalFailure("shutdown", failure);
  process.exit(1);
}
```

`settle`, `abortOutcome`, and `after` are small helpers that convert fulfillment, rejection, abort, and delay into tagged outcomes; they must not discard a late rejection. The abort grace is a cleanup-confirmation bound, not a second permission to continue serving. A normal operation failure may propagate to the guarded unwind. An ignored abort, never-resolving operation, or cleanup whose completion cannot be proven reaches `terminalBootstrapFailure` or `terminalShutdownFailure`; setting only `process.exitCode` is not a terminal escalation because owned handles can keep the process alive.

Listener ownership must also be visible before binding starts. `prepareHttpListener(app, port)` must synchronously return a closeable adapter **before** `bind(signal)` can open a socket. Its idempotent `close(signal)` handles unopened, partially binding, bound, and draining states. `bind(signal)` does not reject until any partially opened listener is closed; an underlying listen API without cancellable binding must be wrapped so the adapter records the native handle synchronously and closes it on abort. Never use an API that can open a socket and then leave the caller waiting without either a previously registered disposer or adapter-internal unwind.

`main.ts` parses configuration and creates a bootstrap logger without acquiring an external resource. It then creates the bootstrap controller, one idempotent shutdown path shared by every caller, and persistent signal handlers **before** preparing or invoking runtime acquisition. The transport factory remains inside the guarded startup block so a factory failure closes the already-owned runtime. Required dependencies finish starting before listener admission. A startup controller aborts runtime acquisition, partial worker startup, or listener binding immediately when shutdown begins; the bounded stage wrapper proves that cancellation and ownership cleanup settle.

The signal callback must observe both branches of the shared shutdown promise. Resolve a non-rejecting lifecycle completion record from those branches, then let `main` await that record. This prevents a discarded rejection and keeps a successfully started process pending until shutdown actually settles. An outer `finally` removes handlers even when a test terminator throws; the shared shutdown also removes them in its own `finally` so callers that observe it directly receive the same guarantee:

```ts
type StartupOutcome = { ok: true } | { ok: false; error: unknown };
type LifecycleOutcome = { ok: true } | { ok: false; error: unknown };

export async function main(
  resolvedEnv: NodeJS.ProcessEnv,
  deps: BootstrapDependencies = productionBootstrapDependencies,
): Promise<void> {
  const config = parseConfig(resolvedEnv);
  const bootstrapLogger = deps.createBootstrapLogger(config);

  const bootstrapController = new AbortController();
  const shutdownController = new AbortController();
  const startupSettled = deferred<void>();
  const lifecycleDone = deferred<LifecycleOutcome>();

  let runtimeOwner: CloseableAcquisition<Runtime> | undefined;
  let runtime: Runtime | undefined;
  let listenerOwner: ReturnType<typeof prepareHttpListener> | undefined;
  let listener: HttpListener | undefined;
  let shutdownRequested = false;
  let startupOutcome: StartupOutcome = { ok: true };
  let shutdownPromise: Promise<void> | undefined;

  const onSigint = () => observeShutdown("SIGINT");
  const onSigterm = () => observeShutdown("SIGTERM");

  function removeSignalHandlers(): void {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  }

  function observeShutdown(reason: "SIGINT" | "SIGTERM"): void {
    const sharedShutdown = shutdown(reason);
    sharedShutdown.then(
      () => lifecycleDone.resolve({ ok: true }),
      (error) => lifecycleDone.resolve({ ok: false, error }),
    );
  }

  function shutdown(reason: "SIGINT" | "SIGTERM" | "startup-failure"): Promise<void> {
    shutdownRequested = true;
    bootstrapController.abort(new Error(`bootstrap cancelled by ${reason}`));

    shutdownPromise ??= (async () => {
      const failures: unknown[] = [];
      try {
        try {
          await withDeadline({
            stage: "startup-settlement",
            parentSignal: shutdownController.signal,
            timeoutMs: config.shutdownTimeoutMs,
            abortGraceMs: config.abortGraceMs,
            operation: async () => startupSettled.promise,
            onAbort: async () => {},
            terminal: deps.terminalShutdownFailure,
          });
        } catch (error) {
          failures.push(error);
        }

        if (listener) {
          let admissionStopped = false;
          try {
            await withDeadline({
              stage: "listener-stop-admission",
              parentSignal: shutdownController.signal,
              timeoutMs: config.shutdownTimeoutMs,
              abortGraceMs: config.abortGraceMs,
              operation: (signal) => listener!.stopAdmission(signal),
              onAbort: () => listenerOwner!.close(AbortSignal.timeout(config.abortGraceMs)),
              terminal: deps.terminalShutdownFailure,
            });
            admissionStopped = true;
          } catch (error) {
            failures.push(error);
          }

          if (admissionStopped) {
            try {
              await withDeadline({
                stage: "listener-drain",
                parentSignal: shutdownController.signal,
                timeoutMs: config.shutdownTimeoutMs,
                abortGraceMs: config.abortGraceMs,
                operation: (signal) => listener!.drain(signal),
                onAbort: () => listenerOwner!.close(AbortSignal.timeout(config.abortGraceMs)),
                terminal: deps.terminalShutdownFailure,
              });
            } catch (error) {
              failures.push(error);
            }
          }
        }

        try {
          await closeOrTerminate(
            "listener-close",
            (signal) => listenerOwner?.close(signal) ?? Promise.resolve(),
            config,
            deps.terminalShutdownFailure,
          );
        } catch (error) {
          failures.push(error);
        }

        try {
          await closeOrTerminate(
            "runtime-close",
            (signal) => runtimeOwner?.close(signal) ?? Promise.resolve(),
            config,
            deps.terminalShutdownFailure,
          );
        } catch (error) {
          failures.push(error);
        }

        if (failures.length > 0) {
          throw new AggregateError(failures, `shutdown failed after ${reason}`, {
            cause: failures[0],
          });
        }
      } finally {
        removeSignalHandlers();
      }
    })();

    return shutdownPromise;
  }

  // Handlers and the abort controller exist before prepareRuntimeAcquisition
  // or createRuntime can acquire a database, client, worker, or socket.
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);

  try {
    try {
      if (!shutdownRequested) {
        runtimeOwner = prepareRuntimeAcquisition(config, bootstrapLogger);
        runtime = await withDeadline({
          stage: "runtime-acquire",
          parentSignal: bootstrapController.signal,
          timeoutMs: config.startupTimeoutMs,
          abortGraceMs: config.abortGraceMs,
          operation: (signal) => runtimeOwner!.acquire(signal),
          onAbort: () => runtimeOwner!.close(AbortSignal.timeout(config.abortGraceMs)),
          terminal: deps.terminalBootstrapFailure,
        });

        const app = createHttpApp(runtime);
        await withDeadline({
          stage: "runtime-start",
          parentSignal: bootstrapController.signal,
          timeoutMs: config.startupTimeoutMs,
          abortGraceMs: config.abortGraceMs,
          operation: (signal) => runtime!.start(signal),
          onAbort: () => runtimeOwner!.close(AbortSignal.timeout(config.abortGraceMs)),
          terminal: deps.terminalBootstrapFailure,
        });

        if (!shutdownRequested) {
          listenerOwner = prepareHttpListener(app, config.port);
          listener = await withDeadline({
            stage: "listener-bind",
            parentSignal: bootstrapController.signal,
            timeoutMs: config.startupTimeoutMs,
            abortGraceMs: config.abortGraceMs,
            operation: (signal) => listenerOwner!.bind(signal),
            onAbort: () => listenerOwner!.close(AbortSignal.timeout(config.abortGraceMs)),
            terminal: deps.terminalBootstrapFailure,
          });
        }
      }
    } catch (error) {
      if (!shutdownRequested) startupOutcome = { ok: false, error };
    } finally {
      startupSettled.resolve();
    }

    if (!startupOutcome.ok) {
      const startupFailure = startupOutcome.error;
      process.exitCode = 1;
      try {
        await shutdown("startup-failure");
      } catch (cleanupError) {
        throw combineFailures(
          startupFailure,
          cleanupError,
          "bootstrap failed and shutdown cleanup also failed",
        );
      }
      throw startupFailure;
    }

    const outcome = await lifecycleDone.promise;
    if (!outcome.ok) throw outcome.error;
  } finally {
    // Also runs when an injected terminal function throws in deterministic tests.
    removeSignalHandlers();
  }
}
```

`closeOrTerminate` is the shutdown equivalent of `withDeadline`: it supplies a fresh `AbortSignal`, aborts at its deadline, observes late settlement, and invokes `terminalShutdownFailure` on rejection or unconfirmed settlement. Its two call sites close the listener owner and runtime-acquisition owner even when construction was partial. The listener adapter's `stopAdmission(signal)` marks the instance unready and prevents new work before `drain(signal)` waits for owned requests; admission shutdown is a bounded cancellable stage, not a synchronous assumption. The runtime's idempotent `close(signal)` stops and drains its own producers, loops, and jobs before closing dependencies in reverse construction order. If HTTP factory construction, required dependency startup, or listener binding fails, the same shared shutdown closes every resource already owned before propagating the startup error. Keep signal handlers installed until that promise settles, observe both fulfillment and rejection, then remove both handlers. Use the target runtime's equivalent listener APIs; the ordering, cancellation, aggregation, terminal escalation, and ownership guarantees are the contract.

Manual factories and narrow interfaces are the default dependency-injection mechanism. Add a container only after documenting scopes, disposal, cycle handling, debugging behavior, and the test seam it improves.

### Thin Elysia HTTP adapter

When Elysia is selected, keep its context at the transport boundary and expose only stable health state:

```ts
const requestIdPattern = /^[A-Za-z0-9._-]{1,80}$/;

export function createHttpApp(runtime: Runtime) {
  return new Elysia()
    .derive(({ request, set }) => {
      const supplied = request.headers.get("x-request-id");
      const requestId =
        supplied && requestIdPattern.test(supplied) ? supplied : crypto.randomUUID();
      set.headers["x-request-id"] = requestId;
      return {
        requestId,
      };
    })
    .onError(({ code, requestId, set }) => {
      const publicFailure =
        code === "VALIDATION"
          ? { status: 400, error: "invalid_request" }
          : code === "NOT_FOUND"
            ? { status: 404, error: "not_found" }
            : { status: 500, error: "internal_error" };

      runtime.logger.error("http request failed", {
        requestId,
        errorCode: String(code),
      });
      set.status = publicFailure.status;
      return { status: "error", code: publicFailure.error, requestId };
    })
    .get("/healthz", () => ({ status: "ok" }))
    .get("/readyz", async ({ set }) => {
      const ready = (await runtime.getReadiness()).ready;
      if (!ready) set.status = 503;
      return { status: ready ? "ready" : "not_ready" };
    })
    .use(projectRoutes({ projects: runtime.services.projects }));
}
```

`createHttpApp` does not call `listen`, create clients, or start workers. Route factories receive the narrow service they need, validate transport input, and map domain results to sanitized responses. The error hook returns only a stable public code and the validated or generated correlation ID; it never returns `error.message`, a stack, provider output, or secret-bearing context. Adapt the logger call to the target's structured logger, but allowlist only the correlation ID and stable error category rather than passing the raw error object. Avoid arbitrary check maps or raw dependency failures in public readiness payloads.

Implement a small close-stack helper or explicit close sequence. Register a cleanup immediately after a resource becomes owned, and unwind it if later construction fails. Apply timeouts to drain and cleanup, but retain enough error context to diagnose which resource failed without logging secrets.

Readiness may aggregate required checks with short timeouts and stable names. Keep `/healthz` cheap; return a non-success status from `/readyz` when the instance must leave traffic. Avoid returning credentials, raw provider errors, or internal topology in either response.

### Suggested tests

- Use call-order spies to prove start and cleanup order.
- Send a missing, invalid-character, and over-80-character `x-request-id`; prove each invalid value is replaced, the response header and error body use the same generated correlation ID, and a valid bounded ID is preserved.
- Throw an error whose message and stack contain a sentinel secret; prove the public response contains only `invalid_request`, `not_found`, or `internal_error` plus the correlation ID, while the trusted log records only the allowlisted ID and stable error category.
- Simulate failure at client, service, listener, and subscription initialization.
- Deliver a signal immediately after handler registration but before `prepareRuntimeAcquisition`; prove no external handle opens, shared shutdown settles, and `main` remains pending until that settlement.
- Make runtime or database acquisition never resolve after abort; prove the synchronously prepared closeable owner runs and the bounded `runtime-acquire` stage reaches `terminalBootstrapFailure` when settlement remains unconfirmed.
- Open a partial database test handle, then fail runtime construction and cleanup; assert the thrown `AggregateError` preserves the construction error first, the cleanup error second, and the construction error as `cause`.
- Make `createHttpApp` throw after runtime creation; assert the runtime owner closes exactly once and both signal handlers are removed after cleanup settles.
- Use call-order spies to prove required `runtime.start()` work finishes before listener binding can admit requests.
- Deliver a termination signal before and during listener binding or `runtime.start()`; prove admission does not escape the guard and every acquired resource unwinds.
- Hold cleanup pending, send repeated `SIGINT` and `SIGTERM` events, and assert both remain intercepted, share one cleanup promise, cleanup runs once, and no task-owned signal handlers remain after settlement.
- Return a never-resolving `runtime.start(signal)` that ignores abort; advance fake timers through the deadline and abort grace, and assert `terminalBootstrapFailure` runs exactly once.
- Let `bind(signal)` open a test socket and then never resolve; prove the synchronously registered `listenerOwner.close(signal)` removes the partial bind before propagation, and prove ignored cancellation reaches `terminalBootstrapFailure` without leaving the port open.
- Make `stopAdmission(signal)` never resolve and prove its deadline aborts admission, forces listener close, and reaches `terminalShutdownFailure` when settlement remains unconfirmed.
- Start an in-flight request or job, make `drain(signal)` never resolve, and prove bounded drain behavior: abort forces listener close before `terminalShutdownFailure`; use an injected throwing terminator so the test process itself stays alive.
- Reject a timed-out operation after terminal escalation and assert the `settle` observer consumes that late rejection without an `unhandledRejection` event.
- Make each injected terminal function throw; prove listener and runtime `closeOrTerminate` call sites are attempted, original and cleanup failures are aggregated, and task-owned signal handlers are still removed in `finally`.
- Make `listenerOwner.close(signal)` never resolve; advance the close deadline and abort grace, and prove it reaches `terminalShutdownFailure` with the owning `listener-close` stage.
- Make `runtimeOwner.close(signal)` never resolve; advance the close deadline and abort grace, and prove it reaches `terminalShutdownFailure` with the owning `runtime-close` stage.
- Make listener/runtime close reject and the injected terminal function throw; prove `closeOrTerminate` preserves the close error first and the terminal error second in an `AggregateError` on both its direct-rejection and internal-deadline terminal paths.
- Reject the shared shutdown promise from a signal; prove the two-branch observer records the failure, `main` observes it from `lifecycleDone.promise`, and no discarded `void` promise rejection occurs.
- Reject each guarded startup stage with every falsy JavaScript rejection value (`undefined`, `null`, `false`, `0`, and `""`); prove the tagged startup outcome still calls `shutdown("startup-failure")`, closes listener and runtime owners in order, removes signal handlers, and rethrows the exact primary value when cleanup succeeds.
- Prove cooperative acquisition, startup, bind, admission-stop, and drain cancellation settles within the abort grace and never calls either terminal function.
- Import route and shared-runtime modules in a test and assert no listener or client is created.

## Official sources

- [Node.js: Process signal events](https://nodejs.org/api/process.html#signal-events)
- [Node.js: HTTP server close](https://nodejs.org/api/http.html#serverclosecallback)
- [Bun: HTTP server lifecycle](https://bun.sh/docs/api/http)
- [Elysia: Lifecycle](https://elysiajs.com/essential/life-cycle)
- [Elysia: Plugins](https://elysiajs.com/essential/plugin)
- [Kubernetes: Liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
