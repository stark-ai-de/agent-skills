# ADR-0042: Optimize GitHub Actions with owned gates

ID: ADR-0042
Title: Optimize GitHub Actions with owned gates
Status: Superseded
Date: 2026-08-11
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, ci, caching, concurrency, artifacts, github-pages, release
Applies when: Maintaining repository GitHub Actions validation, Pages deployment, or release publication.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0043
Guide verified: 2026-08-11
Gist: Validate owns trusted main artifact production and deployment, while release publication reuses exact attempt-bound proof.

Variants: [Short](0042-optimize-github-actions-with-owned-gates.short.md) · **Long, canonical** · [Guide](0042-optimize-github-actions-with-owned-gates.guide.md)

## Decision

We will keep the required `Validate` workflow as the single trusted producer and deployer of the validated Pages artifact. Every `push` to `main` and explicit manual dispatch from `main` runs the full unfiltered validation, computes one trusted-main decision, and, after success, publishes attempt-scoped Pages and receipt artifacts before deploying that exact Pages artifact. Pull requests and manual dispatches from other branches remain validation-only. `Publish Release` will reuse only an exact successful main-push Validate run and attempt whose SHA, candidate fingerprint, receipt, and artifact metadata still match; it will not rerun the aggregate suite.

## Why

- The required `Validate` workflow already runs the aggregate repository checks and builds the Astro site, so a separate Pages build would duplicate the owning proof.
- Every successful main push must refresh the catalog; path-filtered deployment would make freshness depend on a stale relevance list.
- The lockfile-bound pnpm store is regenerable dependency state. It is useful cache material but cannot stand in for validation or deployment proof.
- A rerun preserves the workflow run ID while incrementing its attempt. Including both values in artifact names makes each proof set unambiguous.
- Candidate fingerprints before the gates, from the smoke-copy operation, and after the gates bind the receipt to the exact bytes that were validated and installed.
- Release readiness can safely skip the aggregate suite only after it resolves the exact successful main-push run and attempt, verifies REST metadata and receipt fields, rechecks the candidate fingerprint, and confirms `main` has not advanced.

## Options

- Chosen: Keep `Validate` unfiltered for pull requests; run and deploy it for every successful main push and manual-main dispatch; use one trusted-main output; cache only the lockfile-bound pnpm store; upload `github-pages-<run-id>-<run-attempt>` and `validation-receipt-<run-id>-<run-attempt>`; and make release readiness resolve and verify that exact proof.
- Rejected: Keep a separate `pages.yml`, because it rebuilds the same site and creates a second trigger and provenance boundary.
- Rejected: Filter main deployment by paths, because a successful main push must always refresh Pages and path lists drift from the actual site inputs.
- Rejected: Use a `workflow_run` handoff, because it adds a privileged cross-workflow boundary and a larger artifact-security surface.
- Rejected: Use fixed artifact names, because reruns share a run ID while their attempts and outputs differ.
- Rejected: Treat the pnpm cache, a local receipt, or a previous run's output as validation proof, because those materials are not bound to the integrated hosted candidate.
- Rejected: Move Pages production into `publish-release.yml`, because catalog freshness would become release-dependent or require a second trigger and cross-workflow artifact handoff; a future ownership change requires a successor ADR.

## Consequences

- Good: one validated site build supplies Pages deployment and release evidence without duplicate aggregate work.
- Good: lockfile-bound dependency caching remains reusable while validation proof stays in immutable artifacts.
- Good: attempt-scoped names and REST metadata checks isolate reruns and prevent wrong-run reuse.
- Good: receipt fields expose the workflow, candidate, toolchain, environment overrides, site digest, and exact artifact identities needed for audit and reuse.
- Tradeoff: Validate owns repository checks, Pages deployment, and the receipt contract; changes to those boundaries require revisiting this decision.
- Tradeoff: Pages and receipt artifacts must remain available for the manual release window, and hosted rollout evidence is a post-merge gate.
- Risk: missing, expired, malformed, or contradictory hosted evidence fails release readiness closed and requires a fresh successful main push.

## Follow-up

- Record the hosted event matrix after merge, including cache restoration, PR behavior, main push and manual-main deployment, manual non-main validation-only behavior, rerun attempt isolation, release dry-run acceptance, malformed or missing proof rejection, and advanced-main rejection.
- Revisit aggregate parallelism or full action SHA pinning only through separate decisions; neither is part of this contract.
