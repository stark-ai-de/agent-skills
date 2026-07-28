# AC-ADR-018: Validate Behavior at the Owning Boundary and Promote Enforcement Gradually

ID: AC-ADR-018
Title: Validate Behavior at the Owning Boundary and Promote Enforcement Gradually
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, validation, enforcement, evidence
Applies when: Implementing, refactoring, reviewing, or turning documented rules into automated gates.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Prove behavior at the boundary that owns it and harden reliable checks into gates in deliberate stages.

Variants: **Short** · [Long, canonical](ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.long.md) · [Guide](ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.guide.md)

## Decision summary

Each change is validated at the narrowest boundary that owns the behavior, then at every integration or user boundary whose contract could fail. Pure logic receives focused unit coverage, trust and I/O boundaries receive integration or contract coverage, and critical journeys receive production-like end-to-end coverage.

Tests isolate mutable state, control time and network behavior, and assert observable outcomes instead of incidental implementation structure. A documented rule becomes a blocking gate only after the check is deterministic, its scope and exceptions are explicit, and maintainers have seen its advisory evidence. Every report distinguishes source/static, local, CI, publication/install, deployed/production, and external proof; success at one stage never proves a later stage.

## Read next

Read the [Long variant](ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.long.md) when selecting test layers, defining reliable fixtures, promoting a check, or claiming validation. Load the [Guide](ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.guide.md) for a change-to-test procedure and current framework references.
