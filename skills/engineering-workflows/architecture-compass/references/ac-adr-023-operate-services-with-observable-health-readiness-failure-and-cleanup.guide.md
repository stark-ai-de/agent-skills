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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Make service health, readiness, failures, retries, shutdown, and ownership observable and testable.

Variants: [Short](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.short.md) · [Long, canonical](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Define the operating contract

Create a matrix before wiring telemetry:

| Concern      | Decision to record                                                        |
| ------------ | ------------------------------------------------------------------------- |
| Useful work  | Success, rejection, partial success, and final failure signals            |
| Correlation  | Request, trace, job, tenant-safe, and artifact identifiers                |
| Health       | Startup, liveness, readiness, drain, and degraded semantics               |
| Dependencies | Criticality, timeout, retry owner, fallback, and circuit or shed behavior |
| Async work   | Concurrency, lease, deduplication, poison handling, and backlog signal    |
| Cleanup      | Admission stop, drain order, deadlines, resource close, and forced exit   |
| Operations   | Objective, alert, owner, runbook, rollback, and evidence source           |

Prefer semantic attributes and stable event names over interpolated log strings. Log identifiers needed for investigation, but avoid recording entire request bodies, credentials, or model conversations.

## Failure exercises

- Delay and fail each critical dependency; verify timeout ownership and bounded retries.
- Deliver the same job or command twice; verify idempotent or deduplicated outcome.
- Saturate concurrency or queue capacity; verify backpressure and actionable signals.
- Terminate during startup, active work, and draining; verify new work stops and resources close once.
- Fail the telemetry exporter; verify useful work and shutdown do not hang indefinitely.
- Verify readiness changes before traffic drain and that liveness does not restart a recoverably degraded process.

Run these locally and in CI where deterministic. After authorized deployment, verify the platform actually consumes the intended probes, termination grace, dashboards, and alerts. Label notification-provider or external-dependency checks as external evidence.

## Official sources

- [OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Kubernetes liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Kubernetes pod termination flow](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)
- [Google SRE: monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/)
