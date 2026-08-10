# ADR-0041: Select validation from changed contracts and owning boundaries

ID: ADR-0041
Title: Select validation from changed contracts and owning boundaries
Status: Accepted
Date: 2026-08-10
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: evidence-reuse, testing, validation-cadence
Applies when: Planning, implementing, delegating, resuming, or validating repository changes.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-10
Gist: Repository changes use risk-based owning-boundary proof and exact evidence reuse, with aggregates reserved for mandatory gates.

Variants: [Short](0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) · **Long, canonical** · [Guide](0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)

## Decision

This repository adopts the risk, cadence, proof-ownership, receipt-identity, representative-environment, and failure-recovery contract of [AC-ADR-049](../../skills/engineering-workflows/architecture-compass/references/ac-adr-049-distinguish-change-risk-from-representative-environment-observation.long.md), with the repository-specific aggregate boundary below.

For every repository change, select validation from mandatory repository, CI, release, user, and accepted-ADR gates; each changed observable contract at its owning boundary; and only the uncertainty or failure-localization checks needed for the slice. Deduplicate by logical proof obligation, assign exactly one owner to each obligation, and choose `reuse`, `final-batch`, `checkpointed`, or `reproduce-first` according to the highest changed-contract risk. Risk follows the changed contract and blast radius, not merely the environment in which evidence is observed.

Reuse a receipt only when its proof obligation, subject and revision or content fingerprint, command or scenario, harness, configuration, fixtures, lockfile, toolchain, evidence stage, environment, status, result, freshness, and governing contracts still match. Any relevant change or contradictory newer evidence invalidates only the affected receipt. Delegated or historical evidence is context until it is reconciled to the integrated candidate.

Focused owning-boundary checks are the default during implementation. The configured hosted CI aggregate remains a mandatory pull-request gate. Run the local `npm run validate` aggregate before reporting a release-intent candidate locally ready, or when another mandatory repository, accepted-ADR, user, or approved risk-plan gate makes it a distinct final proof obligation; do not run it merely because work is being finalized. If the user explicitly excludes the local aggregate, do not run it, record any mandatory obligation as `not run`, and do not claim the affected readiness. When a required aggregate fails, stabilize the smallest owning reproducer, freeze a new candidate, and rerun the aggregate once.

Preview, production, publication, deployment, and other external evidence remain separate stages and require separate authority. Observation environment neither lowers the risk of a changed contract nor creates authority. A changed external-runtime, infrastructure, public, trust, or data contract is never low risk, and representative-environment observation never replaces a mandatory earlier gate.

## Why

- A binding local rule is required before replacing the repository's blanket aggregate instruction with changed-contract validation.
- Focused checks reduce duplicate work only when every mandatory gate and changed observable contract still has an explicit owner.
- Exact receipt identity prevents historical, delegated, or earlier-candidate evidence from being presented as current proof.
- Hosted, publication, deployment, Preview, and production observations prove different stages and must not silently expand authority.

## Options

- Chosen: Adapt AC-ADR-049 with repository-specific local aggregate obligations for release intent, hosted pull requests, and other mandatory or approved gates.
- Rejected: Run the local aggregate whenever work is finalized, because finalization alone does not create a distinct proof obligation.
- Rejected: Never run aggregates, because release readiness, hosted CI, and other mandatory gates still require integrated proof.
- Rejected: Treat a setup report or validation receipt as binding policy, because those artifacts are non-normative evidence tied to a specific candidate.

## Consequences

- Good: Repository work uses the smallest complete proof set while retaining release and hosted CI aggregates.
- Good: Evidence reuse and delegation are auditable against exact candidate, toolchain, stage, and environment identity.
- Tradeoff: Agents must maintain a compact proof ledger and reconcile delegated results before making completion claims.
- Risk: Incorrect risk classification or receipt reuse could omit a required check; mandatory rules and the highest applicable risk override efficiency.

## Follow-up

- Bind this decision through `AGENTS.md` and preserve the 2026-07-31 setup report only as historical evidence.
- Create a reciprocal successor if the risk model, receipt identity, or repository aggregate obligations change materially.
