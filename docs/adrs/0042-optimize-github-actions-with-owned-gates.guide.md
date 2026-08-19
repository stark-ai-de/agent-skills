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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-11
Gist: Assign checks to their owning events, cache dependencies, cancel stale validation, and reuse exact release-readiness proof.

Variants: [Short](0042-optimize-github-actions-with-owned-gates.short.md) · [Long, canonical](0042-optimize-github-actions-with-owned-gates.long.md) · **Guide**

This guide is non-normative. [Long](0042-optimize-github-actions-with-owned-gates.long.md) is the authoritative decision; if this guidance conflicts with Long, follow Long.

## How to apply

- Use `pnpm/setup@v2` after checkout with `runtime: node@24.18.0`, `cache: true`, and `install: false`; run `pnpm install --frozen-lockfile --prefer-offline` explicitly.
- Keep checkout shallow. On pull requests, fetch only `pull_request.base.sha` so release-intent scripts can diff without cloning full history.
- After `npm run validate` (which already includes `validate:network-endpoints`), run `validate:archives` and `verify:release-reproducibility` in Validate. Keep the full `validate:release-proof` chain on `Publish Release`, which does not run the local aggregate.
- Keep the required `Validate` workflow unfiltered for pull requests, add per-event concurrency cancellation for pull requests and pushes, and leave manual dispatches independent.
- Let the Pages workflow run on relevant `main` changes and explicit dispatches. Site output inputs are `site/**`, `skills/**`, `incubator/**`, `skill-evals/**`, package-manager manifests, and the Pages workflow itself.
- In `Publish Release`, wait for a successful hosted `Validate` run for the checked-out `main` SHA when that run is still queued or in progress, fail closed if it completed unsuccessfully, run release-specific checks, and capture that immutable SHA; the publish job must verify that SHA and current `main` before tagging and must not repeat the aggregate suite.

## Verification

- Run `npm run lint:actions` and `git diff --check` for the workflow and documentation changes.
- After publication, inspect hosted runs for a pnpm cache hit, a canceled superseded Validate run, no Pages pull-request runs, a successful Pages deployment, and a successful release handoff.
- Keep local workflow lint separate from hosted run and deployment proof.

## Current references

- [GitHub Actions dependency caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [GitHub Actions concurrency](https://docs.github.com/en/actions/using-jobs/using-concurrency)
- [pnpm/setup](https://github.com/pnpm/setup)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Revisit

Create a new ADR that supersedes this record when the workflow ownership, cache boundary, or release-readiness handoff changes. Update all three variants and both sides of the supersession metadata in one change.
