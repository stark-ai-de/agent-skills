# ADR-0041: Optimize GitHub Actions with owned gates

ID: ADR-0041
Title: Optimize GitHub Actions with owned gates
Status: Proposed
Date: 2026-08-11
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, ci, caching, concurrency, release
Applies when: Maintaining repository GitHub Actions validation, Pages deployment, or release publication.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-11
Gist: Assign checks to their owning events, cache dependencies, cancel stale validation, and reuse exact release-readiness proof.

Variants: [Short](0041-optimize-github-actions-with-owned-gates.short.md) · **Long, canonical** · [Guide](0041-optimize-github-actions-with-owned-gates.guide.md)

## Decision

We will assign GitHub Actions checks to the event and boundary that own their proof, cache the pnpm store from the repository lockfile, cancel superseded validation runs, and let publication reuse the exact commit proven by release readiness instead of repeating the full suite.

## Why

- The required `Validate` workflow already builds the Astro site through `npm run validate`, so a second Pages build on every pull request adds no required proof and never deploys.
- The pnpm store is the reusable dependency boundary; its cache key is bound to `pnpm-lock.yaml` rather than to generated `node_modules`.
- Pull-request and main-branch validation can be superseded safely while a manual validation dispatch remains independent.
- `release-readiness` requires a successful hosted `Validate` run for `main`, runs release-specific checks, records `release_sha`, and the publish job verifies that `main` still points to that exact SHA before creating a tag.

## Options

- Chosen: Cache the lockfile-bound pnpm store, cancel stale non-manual validation, run Pages only for relevant main changes or explicit dispatch, and reuse the successful hosted Validate receipt plus release-specific readiness checks during publication.
- Rejected: Keep Pages builds on every pull request, because the required Validate job already builds the same site and Pages does not deploy there.
- Rejected: Filter the required Validate workflow by paths, because a skipped required check can remain pending and block a pull request.
- Rejected: Rerun the full suite in the publish job, because it would validate the same immutable SHA twice after readiness.

## Consequences

- Good: Repeated dependency setup, redundant Pages pull-request jobs, stale validation runs, and duplicate release validation are reduced.
- Tradeoff: Pages pull-request confidence comes from the required Validate site build, and the publish job depends on the readiness handoff remaining intact.
- Risk: A future change that weakens readiness or changes site inputs must update the owning workflow and this decision together.

## Follow-up

- Promote this Proposed ADR only after a hosted run confirms cache restore behavior, concurrency cancellation, Pages deployment, and a dry-run/publish handoff on the changed workflow revision.
