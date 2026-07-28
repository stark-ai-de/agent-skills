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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Own measurable journey budgets, compare representative baselines, and optimize the bottleneck shown by lab and field evidence.

Variants: [Short](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.short.md) · [Long, canonical](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Budget template

```text
Journey or workload:
User or operator impact:
Metric and unit:
Percentile or aggregation:
Target and warning threshold:
Population or deterministic fixture:
Device, network, cache, and data conditions:
Environment and collection tool:
Artifact identity:
Owner and review cadence:
Enforcement stage and variance policy:
Counter-metrics and non-regression constraints:
```

Start with the few journeys or workloads whose delay, instability, cost, or saturation changes product outcomes. Use current Web Vitals definitions when they fit a web journey, but keep the repository's exact thresholds and measurement conditions in its own ADR or performance policy so they can evolve deliberately.

## Evidence-driven loop

1. Reproduce the target journey with a named artifact and representative fixture.
2. Capture multiple baseline samples plus a trace, profile, bundle report, query plan, or resource signal that can locate work.
3. State one bottleneck hypothesis and expected metric movement.
4. Make the smallest change that tests the hypothesis.
5. Repeat under the same conditions and inspect correctness, accessibility, security, errors, resource use, and other counter-metrics.
6. Validate in CI or a stable lab if the signal is gateable, then separately inspect the published and deployed artifact when authorized.
7. Compare field data only after accounting for population, rollout, cache, geography, device, and time-window changes.

For Next.js, inspect client boundaries, route rendering mode, duplicated requests, cache semantics, bundle composition, images, fonts, and third-party scripts before selecting an optimization. For data paths, capture query plans and representative cardinality rather than relying on query duration from an empty local database.

## Evidence note

Label results as lab or field and as local, CI, publication/install, deployed/production, or external. Include tool version, run count, variance or distribution, conditions, revision or artifact, result, and limitations. Do not describe an emulator or synthetic run as real-user field data.

## Official sources

- [Web Vitals](https://web.dev/articles/vitals)
- [Lab and field data differences](https://web.dev/articles/lab-and-field-data-differences)
- [Chrome User Experience Report](https://developer.chrome.com/docs/crux)
- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
