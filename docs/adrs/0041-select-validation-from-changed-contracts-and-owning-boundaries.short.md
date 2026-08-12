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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0044
Guide verified: 2026-08-10
Gist: Repository changes use risk-based owning-boundary proof and exact evidence reuse, with aggregates reserved for mandatory gates.

Variants: **Short** · [Long, canonical](0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)

## Decision

This repository adopts the risk, cadence, proof-ownership, receipt-identity, representative-environment, and failure-recovery contract of [AC-ADR-049](../../skills/engineering-workflows/architecture-compass/references/ac-adr-049-distinguish-change-risk-from-representative-environment-observation.long.md), with the repository-specific aggregate boundary below.

For every repository change, select validation from mandatory repository, CI, release, user, and accepted-ADR gates; each changed observable contract at its owning boundary; and only the uncertainty or failure-localization checks needed for the slice. Deduplicate by logical proof obligation, assign exactly one owner to each obligation, and choose `reuse`, `final-batch`, `checkpointed`, or `reproduce-first` according to the highest changed-contract risk. Risk follows the changed contract and blast radius, not merely the environment in which evidence is observed.

Reuse a receipt only when its proof obligation, subject and revision or content fingerprint, command or scenario, harness, configuration, fixtures, lockfile, toolchain, evidence stage, environment, status, result, freshness, and governing contracts still match. Any relevant change or contradictory newer evidence invalidates only the affected receipt. Delegated or historical evidence is context until it is reconciled to the integrated candidate.

Focused owning-boundary checks are the default during implementation. The configured hosted CI aggregate remains a mandatory pull-request gate. Run the local `npm run validate` aggregate before reporting a release-intent candidate locally ready, or when another mandatory repository, accepted-ADR, user, or approved risk-plan gate makes it a distinct final proof obligation; do not run it merely because work is being finalized. If the user explicitly excludes the local aggregate, do not run it, record any mandatory obligation as `not run`, and do not claim the affected readiness. When a required aggregate fails, stabilize the smallest owning reproducer, freeze a new candidate, and rerun the aggregate once.

Preview, production, publication, deployment, and other external evidence remain separate stages and require separate authority. Observation environment neither lowers the risk of a changed contract nor creates authority. A changed external-runtime, infrastructure, public, trust, or data contract is never low risk, and representative-environment observation never replaces a mandatory earlier gate.

## Context

- The previous blanket local aggregate instruction caused repeated broad runs even when a focused owning-boundary check was the distinct proof obligation.
- Release candidates and hosted pull requests still require aggregate evidence, while historical or delegated receipts need exact candidate reconciliation before reuse.

## Consequences

- Good: Validation effort follows changed contracts without weakening mandatory release or CI gates.
- Tradeoff: Proof ownership and receipt identity must be recorded precisely enough to support safe reuse.
- Risk: A misclassified change could omit required evidence; the highest applicable risk and every mandatory gate prevail.
