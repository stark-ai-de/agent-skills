# AC-ADR-023: Operate Services With Observable Health, Readiness, Failure, and Cleanup

ID: AC-ADR-023
Title: Operate Services With Observable Health, Readiness, Failure, and Cleanup
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: runtime-platform
Tags: observability, resilience, operations, lifecycle
Applies when: A deployable runtime, job, queue, subscription, integration, or critical dependency is introduced or changed.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Make service health, readiness, failures, retries, shutdown, and ownership observable and testable.

Variants: [Short](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.short.md) · **Long, canonical** · [Guide](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.guide.md)

## Context

A process that accepts connections can still be unable to perform useful work, while a liveness probe coupled to every dependency can amplify an outage through restart loops. Logs without correlation, retries without budgets, and shutdown without ordering obscure failure and duplicate work. Operational maturity cannot be inferred from a local health response.

## Decision

Every deployable runtime and critical background component defines observable useful work, separate health states, bounded failure behavior, graceful lifecycle ownership, and evidence-based operational objectives.

### Signals and ownership

- Emit structured logs, metrics, and traces or equivalent signals that connect requests, jobs, dependency calls, retries, and outcomes through safe correlation identifiers.
- Redact secrets, tokens, unnecessary personal data, raw model prompts, and unbounded payloads. Telemetry schemas and access are part of the security and data lifecycle.
- Measure outcomes, traffic, errors, latency, queue depth or age, resource saturation, and domain-specific failure where relevant. Every alert names an owner, actionable condition, runbook, and expected response.
- Define service objectives and budgets from target user or operator needs and measured baselines. Do not copy universal thresholds without validating their meaning for the service.

### Health and readiness

- Liveness reports whether the process is making progress or must be restarted. It is minimal and does not fail merely because an optional or recoverable dependency is unavailable.
- Readiness reports whether the instance can safely accept its assigned work. It reflects required initialization, draining, and critical dependency state without exposing internal details.
- Startup handling gives slow initialization a bounded window without weakening steady-state liveness. Health endpoints are cheap, protected from abuse as appropriate, and excluded from noisy logs or tracing only deliberately.
- A healthy endpoint is not sufficient production proof; verify scheduler, load balancer, ingress, queue, or platform behavior at the deployed stage.

### Failure and recovery

- Set timeouts at every remote or blocking boundary and propagate cancellation where supported. Retries are bounded by attempt, time, and workload budgets, use safe backoff and jitter, and do not multiply across uncontrolled layers.
- Retry only operations whose semantics are idempotent or protected by an idempotency key, deduplication, transaction, lease, or compensating design. Record final failure and surface poison work for owned review.
- Define concurrency, backpressure, queue visibility or lease behavior, dead-letter handling, and overload response for asynchronous work.
- Distinguish expected domain rejection from operational failure in contracts and telemetry. User-facing errors remain sanitized while restricted diagnostics preserve cause and correlation.

### Lifecycle and cleanup

- Startup composes dependencies in an explicit order and does not become ready until required initialization completes.
- On termination, stop admitting new work, mark unready, drain or hand off in-flight work within a deadline, close subscriptions and servers, flush bounded telemetry, and release resources in reverse ownership order.
- Shutdown and cleanup are idempotent. Signals, process errors, lease loss, and dependency termination converge on one owned shutdown path rather than competing exits.
- Keep an operator runbook for startup failure, dependency degradation, saturation, poison work, rollback, and cleanup timeout.

### Evidence stages

Test signal shape, redaction, probes, timeouts, retries, idempotency, and shutdown locally and in CI. Verify deployed probe routing, draining, dashboards, alerts, and artifact identity separately. Exercise external dependencies or notification delivery directly before claiming third-party proof.

## Failure handling

When readiness or an operational threshold fails, stop new work or promotion according to the declared policy, preserve correlation and artifact identity, and choose retry, degradation, rollback, or operator intervention explicitly. Avoid automatic restart or retry loops that erase evidence or increase load.

## Acceptance criteria

- Useful work and failure are visible through safe, correlated signals with owners.
- Liveness, readiness, startup, and draining have distinct semantics and tests.
- Timeouts, retries, idempotency, backpressure, and poison-work handling are bounded.
- Shutdown is ordered, idempotent, deadline-aware, and exercised.
- Local, CI, deployed, and external observability evidence are reported separately.

## Consequences

Services carry more explicit operational code and test fixtures. Failures become diagnosable and bounded, deployers receive meaningful health signals, and cleanup and recovery cease to be implicit process behavior.
