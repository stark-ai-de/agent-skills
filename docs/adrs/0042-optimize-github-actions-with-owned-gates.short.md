# ADR-0042: Optimize GitHub Actions with owned gates

ID: ADR-0042
Title: Optimize GitHub Actions with owned gates
Status: Proposed
Date: 2026-08-11
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, ci, caching, concurrency, release
Applies when: Maintaining repository GitHub Actions validation, Pages deployment, or release publication.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Assign checks to their owning events, cache dependencies, cancel stale validation, and reuse exact release-readiness proof.

Variants: **Short** · [Long, canonical](0042-optimize-github-actions-with-owned-gates.long.md) · [Guide](0042-optimize-github-actions-with-owned-gates.guide.md)

## Decision

We will assign GitHub Actions checks to the event and boundary that own their proof, cache the pnpm store from the repository lockfile, cancel superseded validation runs, and let publication reuse the exact commit proven by release readiness instead of repeating the full suite.

## Context

- The required `Validate` workflow already builds the site on pull requests.
- Pages pull-request builds never deploy and duplicate that site build.
- Validation runs are long enough that stale runs consume meaningful runner capacity.
- Release-readiness can reuse the successful hosted Validate receipt for the exact immutable main commit.

## Consequences

- Good: Repeated dependency setup, redundant Pages pull-request jobs, stale validation runs, and duplicate release validation are reduced.
- Tradeoff: Pages pull-request confidence comes from the required Validate site build, and the publish job depends on the readiness handoff remaining intact.
- Risk: A future change that weakens readiness or changes site inputs must update the owning workflow and this decision together.
