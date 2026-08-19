# AC-ADR-042: Calibrate Validation to Change Risk and Reuse Fresh Evidence

ID: AC-ADR-042
Title: Calibrate Validation to Change Risk and Reuse Fresh Evidence
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, validation-cadence, evidence-reuse, test-ownership
Applies when: Implementing, refactoring, delegating, resuming, or validating a bounded change.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: AC-ADR-047
Guide verified: 2026-07-29
Gist: Calibrate validation timing to change risk, reuse uninvalidated evidence, and assign each proof obligation once.

Variants: **Short** · [Long, canonical](ac-adr-042-calibrate-validation-to-change-risk-and-reuse-fresh-evidence.long.md) · [Guide](ac-adr-042-calibrate-validation-to-change-risk-and-reuse-fresh-evidence.guide.md)

## Decision summary

Repositories plan validation from mandatory gates, changed-contract proof, uncertainty, and reusable current evidence. Every proof obligation receives one owner and one of four internal cadences: `reuse`, `final-batch`, `checkpointed`, or `reproduce-first`. Low-risk, reversible, established changes default to one final batch after a cohesive freeze; coupled, uncertain, public-contract, difficult-to-reverse, high, or critical boundaries receive focused earlier checkpoints. New persistent tests require a changed observable contract, reproduced defect, critical journey, trust/data/migration/compatibility boundary, recurring regression, or mandatory gate rather than a coverage number or speculative completeness.

Required local and pre-deployment gates run first. When environment behavior remains relevant, the exact candidate artifact is checked in an available representative Preview. Only when Preview is unavailable or not representative may an already-authorized low-risk reversible change use a bounded read-only or strictly idempotent production probe with safe data, observability, a stop threshold, and rollback. Moderate, high, and critical work never uses production as the first substitute. The policy grants no deployment authority and does not require a complex permanent smoke harness for a one-time environment question.

## Context

Repeated baselines, speculative smoke tests, and per-microstep aggregate runs consume time and tokens without necessarily proving a distinct contract. Final-only validation can still make coupled failures expensive to localize, while prior agent or CI evidence is useful only when its identity and invalidators still match.

## Invariants

- Accepted ADRs, repository instructions, mandatory gates, and critical quality boundaries override efficiency choices.
- Every changed observable contract receives current post-change evidence.
- Reuse never crosses an invalidated subject, input, stage, environment, or governing contract.
- Preview and production remain separate evidence environments and never imply deployment permission.

## Consequences

Validation and permanent test complexity decrease for ordinary reversible work. Agents must instead record compact risk, ownership, receipt, and invalidation data; the risk of later failure localization is bounded through explicit checkpoint triggers.
