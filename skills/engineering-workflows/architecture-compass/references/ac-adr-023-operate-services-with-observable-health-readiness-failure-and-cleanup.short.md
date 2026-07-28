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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Make service health, readiness, failures, retries, shutdown, and ownership observable and testable.

Variants: **Short** · [Long, canonical](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.long.md) · [Guide](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.guide.md)

## Decision summary

Each runtime exposes signals for useful work, readiness, liveness, failure, saturation, and cleanup without leaking sensitive data. Liveness answers whether the process must be restarted; readiness answers whether it can safely receive work. Dependencies, timeouts, retries, idempotency, backpressure, shutdown order, alerts, and runbooks have explicit owners and policies.

Operational objectives and alerts derive from user or operator impact and observed evidence, not universal numbers. Local probe and failure tests do not prove deployed routing, production alert delivery, or external dependency behavior.

## Read next

Read the [Long variant](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.long.md) before adding a deployable, background process, subscription, or critical dependency. Load the [Guide](ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup.guide.md) for a signal matrix, probe and shutdown procedure, and current telemetry references.
