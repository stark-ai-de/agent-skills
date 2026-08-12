# ADR-0041: Select validation from changed contracts and owning boundaries

ID: ADR-0041
Title: Select validation from changed contracts and owning boundaries
Status: Superseded
Date: 2026-08-10
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: evidence-reuse, testing, validation-cadence
Applies when: Planning, implementing, delegating, resuming, or validating repository changes.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0044
Guide verified: 2026-08-10
Gist: Repository changes use risk-based owning-boundary proof and exact evidence reuse, with aggregates reserved for mandatory gates.

Variants: [Short](0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) · [Long, canonical](0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · **Guide**

This guide is non-normative. [Long](0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. List mandatory repository, CI, release, user, and accepted-ADR gates.
2. Identify each changed observable contract and its owning boundary.
3. Add only checks needed to resolve material uncertainty or localize a failure.
4. Deduplicate logical proof obligations and assign one owner to each.
5. Classify the highest changed-contract risk and choose `reuse`, `final-batch`, `checkpointed`, or `reproduce-first` per obligation.
6. Reconcile every receipt to the exact integrated candidate before using it.
7. Freeze a release-intent candidate before its one local aggregate; rely on hosted CI for the separate pull-request aggregate.

When a required aggregate fails, run the smallest owning reproducer while fixing it, freeze a new candidate, and then rerun the aggregate once. Do not report a required skipped or failed gate as complete.

## Provider mapping

- Provider decision: [AC-ADR-049](../../skills/engineering-workflows/architecture-compass/references/ac-adr-049-distinguish-change-risk-from-representative-environment-observation.long.md)
- Disposition: `adapt`
- Local decision: ADR-0041
- Adaptation: Retain contract-based risk, owning-boundary proof, one owner per obligation, exact receipt reuse, representative-environment separation, and focused failure localization. Define this repository's aggregate obligations through hosted pull-request CI, release intent, mandatory or user-specified gates, and an approved risk plan.
- Historical evidence: The 2026-07-31 setup receipt retains its then-current `defer` disposition and is not rewritten as current mapping evidence.

## Receipt reuse check

- Match the proof obligation, subject, revision or content fingerprint, command or scenario, harness, configuration, fixtures, lockfile, and toolchain.
- Match evidence stage, environment, status, result, freshness, and governing contracts.
- Check for newer contradictory evidence and relevant dependency or contract changes.
- Treat delegated and historical evidence as context until all fields reconcile to the integrated candidate.

## Verification

- Confirm the selected focused checks cover each changed contract and mandatory gate exactly once.
- For a release-intent candidate, run the focused checks, freeze the candidate, run the local aggregate, and validate release metadata against the immediate base.
- For a pull request, keep hosted CI as a distinct aggregate proof on the pushed head.
- Keep publication, deployment, Preview, production, and third-party evidence separate and approval-gated.

## Revisit

Create a reciprocal successor if the risk model, receipt identity, or aggregate-gate contract changes. Current command examples and evidence mechanics may be updated here when they do not change the canonical decision.
