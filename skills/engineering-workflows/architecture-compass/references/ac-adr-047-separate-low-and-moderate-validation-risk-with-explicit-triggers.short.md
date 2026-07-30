# AC-ADR-047: Separate Low and Moderate Validation Risk With Explicit Triggers

ID: AC-ADR-047
Title: Separate Low and Moderate Validation Risk With Explicit Triggers
Status: Superseded
Date: 2026-07-29
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, validation-cadence, evidence-reuse, risk-classification
Applies when: Implementing, refactoring, delegating, resuming, or validating a bounded change.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-042
Superseded by: AC-ADR-049
Guide verified: 2026-07-29
Gist: Make low and moderate validation risk disjoint while preserving proportional proof and fresh evidence reuse.

Variants: **Short** · [Long, canonical](ac-adr-047-separate-low-and-moderate-validation-risk-with-explicit-triggers.long.md) · [Guide](ac-adr-047-separate-low-and-moderate-validation-risk-with-explicit-triggers.guide.md)

## Decision summary

Repositories plan validation from mandatory gates, changed-contract proof, uncertainty, and reusable current evidence. Every proof obligation receives one owner and one of four internal cadences: `reuse`, `final-batch`, `checkpointed`, or `reproduce-first`. Low risk is limited to a non-behavioral or established localized adjustment with deterministic acceptance, one owning boundary, easy reversal and diagnosis, and no external-runtime, public-contract, trust, data, or infrastructure trigger. A reversible behavioral change contained within one owning boundary is moderate when it does not qualify as low and has no high or critical trigger. Coupled, uncertain, public-contract, difficult-to-reverse, high, or critical boundaries receive focused earlier checkpoints. New persistent tests require a changed observable contract, reproduced defect, critical journey, trust/data/migration/compatibility boundary, recurring regression, or mandatory gate rather than a coverage number or speculative completeness.

Required local and pre-deployment gates run first. When environment behavior remains relevant, the exact candidate artifact is checked in an available representative Preview. Only when Preview is unavailable or not representative may an already-authorized low-risk reversible change use a bounded read-only or strictly idempotent production probe with safe data, observability, a stop threshold, and rollback. Moderate, high, and critical work never uses production as the first substitute. The policy grants no deployment authority and does not require a complex permanent smoke harness for a one-time environment question.

## Context

AC-ADR-042 established proportional validation, but its broad low and moderate descriptions overlapped for reversible localized behavioral changes. The successor makes that boundary deterministic without weakening any proof, receipt, Preview, production-fallback, or evidence-stage constraint.

## Invariants

- Low risk satisfies every low-risk condition and has no escalation trigger.
- A contained behavioral change that misses a low-risk condition is at least moderate.
- Mandatory gates and changed observable contracts remain proved at their owning boundary.
- Preview and production evidence never grant deployment or production authority.

## Consequences

Risk classification becomes repeatable and low-risk production fallback cannot be reached through an overlapping category. The remaining AC-ADR-042 proof, ownership, receipt, and environment contracts continue unchanged.
