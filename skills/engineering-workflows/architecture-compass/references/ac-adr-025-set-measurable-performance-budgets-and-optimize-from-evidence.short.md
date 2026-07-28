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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Own measurable journey budgets, compare representative baselines, and optimize the bottleneck shown by lab and field evidence.

Variants: **Short** · [Long, canonical](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.long.md) · [Guide](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.guide.md)

## Decision summary

The target repository owns performance budgets for its critical journeys, runtime work, and resource constraints. Budgets define metric, percentile or aggregation, population or fixture, device and network class, environment, collection method, and enforcement stage; Architecture Compass does not invent universal numeric limits.

Optimization begins from a reproducible baseline and measured bottleneck. It preserves correctness, security, privacy, and accessibility while addressing client JavaScript, rendering, assets, network, caching, database, queues, or resource use as evidence indicates. Lab and field data answer different questions and are reported separately; a local improvement does not establish CI, deployed, or real-user performance.

## Read next

Read the [Long variant](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.long.md) before establishing budgets, adding a performance gate, or making an optimization claim. Load the [Guide](ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence.guide.md) for a budget template, investigation loop, and current web-performance sources.
