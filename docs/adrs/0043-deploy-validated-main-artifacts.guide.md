# ADR-0043: Deploy validated main artifacts from Validate

ID: ADR-0043
Title: Deploy validated main artifacts from Validate
Status: Accepted
Date: 2026-08-11
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, ci, artifacts, github-pages, release
Applies when: Maintaining repository validation, Pages deployment, or manual release publication.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0042
Superseded by: None
Guide verified: 2026-08-11
Gist: Make Validate the single trusted producer and handoff for validated main artifacts and release proof.

Variants: [Short](0043-deploy-validated-main-artifacts.short.md) · [Long, canonical](0043-deploy-validated-main-artifacts.long.md) · **Guide**

This guide is non-normative. [Long](0043-deploy-validated-main-artifacts.long.md) is the authoritative decision; if this guidance conflicts with Long, follow Long.

## How to apply

- Keep the required Validate workflow unfiltered for pull requests, main pushes, and manual validation.
- Use pnpm/setup with the lockfile-bound pnpm store cache; always run the frozen install explicitly.
- On trusted main runs, upload the site output and a 30-day receipt after all validation gates pass, retain the Pages artifact for the same release-readiness window, then deploy it from a dependent job.
- Make manual validation groups unique by run ID; cancel superseded pull-request and main-push validation.
- In Publish Release, select only a successful Validate push on main for the exact checked-out SHA and download the receipt by that run ID.
- Keep receipt and release identity checks fail-closed; never treat a dependency cache as validation proof.

## Verification

- Run npm run validate:adrs, pnpm lint:actions, pnpm format:check, pnpm lint, and git diff --check.
- Confirm there is no pull-request Pages workflow run, and that a main run deploys the artifact produced by its successful validation.
- Confirm release readiness rejects PR, manual non-main, wrong-SHA, missing-receipt, and advanced-main cases.
- Keep local workflow validation separate from hosted cache, concurrency, deployment, and release proof.

## Current references

- [GitHub dependency caching](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
- [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [GitHub required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
- [GitHub workflow-run filters](https://docs.github.com/en/rest/actions/workflow-runs)

## Revisit

Create a new ADR that supersedes this record when the Validate ownership, artifact boundary, cache boundary, or release-proof contract changes. Update all three variants and both sides of the supersession metadata in one change.
