# AC-ADR-025: Set Measurable Performance Budgets and Optimize From Evidence

ID: AC-ADR-025
Title: Set Measurable Performance Budgets and Optimize From Evidence
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: performance, budgets, lab-data, field-data
Applies when: A change affects rendering, bundles, network, cache, database, background work, resource use, or user-perceived latency.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Own measurable journey budgets, compare representative baselines, and optimize the bottleneck shown by lab and field evidence.

Variants: [Short](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.short.md) · **Long, canonical** · [Guide](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.guide.md)

## Context

Generic performance advice can trade one bottleneck for another or optimize metrics that do not affect the target journey. A single developer-machine measurement is not representative field evidence, while uncontrolled production data can obscure causality. Framework features such as Server Components, caching, or lazy loading are tools, not performance proof.

## Decision

The target repository defines measurable, owned performance budgets for critical journeys and operating constraints, establishes representative baselines, and chooses optimizations from evidence about the current bottleneck.

### Budgets and baselines

- Each budget names the journey or workload, metric, unit, percentile or aggregation, target population or deterministic fixture, device and network class, data volume, environment, collection method, owner, review cadence, and enforcement stage.
- Cover user-perceived responsiveness and stability plus system constraints material to the target: payload and client JavaScript, server latency, database or queue work, memory, CPU, concurrency, cost, or background completion as applicable.
- Derive numeric targets from product expectations, applicable standards, field distribution, capacity, and measured baseline. Do not copy a universal budget whose conditions and user value differ.
- Keep a reproducible lab fixture for change attribution and collect field or production signals where privacy, consent, platform, and volume allow. Lab and field results are complementary and never silently merged.
- Compare the same artifact, scenario, cache state, data volume, device, network, and measurement method. Record variance and repeat enough samples for the chosen claim.

### Optimization

- Profile or trace before changing architecture. Optimize the measured critical path or constrained resource and define the expected effect and counter-metrics.
- Prefer server rendering and Server Components when they reduce client work for the actual journey; keep client boundaries minimal and intentional. Do not move interaction or state server-side merely to improve a bundle number.
- Load code, images, fonts, scripts, and data according to when the journey needs them. Lazy loading, preloading, streaming, compression, and prioritization are selected from dependency and timing evidence, not applied universally.
- Define cache identity, freshness, invalidation, privacy, and memory bounds before treating caching as an optimization. A fast stale, cross-user, or unbounded result is a defect.
- Measure database plans, scanned rows, indexes, round trips, locking, connection use, and result size before query optimization. Test with representative cardinality and tenant distribution.
- Bound background concurrency, queue age, retries, payload size, and resource use so offloading work does not hide user-visible completion or overload another system.
- Preserve correctness, security, privacy, accessibility, observability, and maintainability. A performance change that weakens an accepted requirement needs an explicit architectural decision, not an undocumented trade.

### Regression and evidence

Promote a performance check to a gate only when its fixture and variance are controlled, thresholds have an owner, failures are actionable, and the chosen environment can measure the signal reliably. Separate source/static analysis, local lab results, CI regression results, published artifact inspection, deployed synthetic or production results, and external field/provider evidence.

A local bundle or lab improvement does not prove CI repeatability, published contents, deployed cache/CDN behavior, production percentiles, or real-user outcomes. Conversely, field movement without controlled analysis does not by itself identify the responsible change.

## Failure handling

When a budget regresses, verify fixture and artifact identity, repeat the measurement, inspect counter-metrics, and stop promotion if the breach is reproducible and relevant. Waivers identify owner, user or capacity impact, reason, expiry, and follow-up. Do not lower a budget solely to make a gate pass.

## Acceptance criteria

- Critical journeys and constrained workloads have target-owned, reproducible budgets and baselines.
- Optimizations cite a measured bottleneck and track intended and counter-metrics.
- Cache, rendering, asset, database, and background choices preserve other accepted requirements.
- Regression gates account for variance and include actionable ownership and waiver rules.
- Reports distinguish lab from field and local from CI, publication, deployment, and external evidence.

## Consequences

Representative fixtures and field instrumentation require ongoing ownership. The repository gains defensible performance priorities, avoids cargo-cult optimization, and can detect regressions in the environment best suited to each signal.
