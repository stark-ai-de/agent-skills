# AC-ADR-062: Cache test transforms without reusing correctness

ID: AC-ADR-062
Title: Cache test transforms without reusing correctness
Status: Accepted
Date: 2026-09-14
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, transform-cache, invalidation, trust-boundaries, performance
Applies when: Persisting or restoring transformed test modules to reduce repeated validation work.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Reuse transformation work only when inputs and trust match, while executing and proving validation independently.

Variants: **Short** · [Long, canonical](ac-adr-062-cache-test-transforms-without-reusing-correctness.long.md) · [Guide](ac-adr-062-cache-test-transforms-without-reusing-correctness.guide.md)

## Decision summary

Use transform caches only as disposable performance artifacts. Test-result evidence, dependency caches and generated build artifacts retain separate identities and owners. Complete transform inputs and trust boundaries must govern reuse, including local plugin dependencies not represented by a remote key.

Execute selected tests regardless of cache hits; require enabled/disabled/cleared and mutation parity, safe bounded recovery and zero false-green failures. Persist remotely only when measured end-to-end savings justify overhead within cost/security budgets. Record intent, inputs, targets, evidence, ownership and revisit conditions locally. Disable unsafe or unhelpful caching without weakening validation; unknown invalidation is not correctness proof.
