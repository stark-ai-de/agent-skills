# ADR-0042: Optimize GitHub Actions with owned gates

ID: ADR-0042
Title: Optimize GitHub Actions with owned gates
Status: Accepted
Date: 2026-08-11
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, ci, caching, concurrency, artifacts, github-pages, release
Applies when: Maintaining repository GitHub Actions validation, Pages deployment, or release publication.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-11
Gist: Validate owns trusted main artifact production and deployment, while release publication reuses exact attempt-bound proof.

Variants: **Short** · [Long, canonical](0042-optimize-github-actions-with-owned-gates.long.md) · [Guide](0042-optimize-github-actions-with-owned-gates.guide.md)

## Decision

We will keep the required `Validate` workflow as the single trusted producer and deployer of the validated Pages artifact. Every `push` to `main` and explicit manual dispatch from `main` runs the full unfiltered validation, computes one trusted-main decision, and, after success, publishes attempt-scoped Pages and receipt artifacts before deploying that exact Pages artifact. Pull requests and manual dispatches from other branches remain validation-only. `Publish Release` will reuse only an exact successful main-push Validate run and attempt whose SHA, candidate fingerprint, receipt, and artifact metadata still match; it will not rerun the aggregate suite.

## Context

- The required `Validate` workflow already builds the Astro site and owns pull-request proof.
- A second Pages workflow would rebuild the site and create a second provenance boundary.
- Reruns keep a run ID but change the run attempt, so fixed artifact names can collide or be selected ambiguously.
- Release readiness needs a fail-closed handoff tied to the exact successful main push, candidate bytes, site output, workflow run, and artifacts.

## Consequences

- Good: one validated site build supplies Pages deployment and release evidence without duplicate aggregate work.
- Good: lockfile-bound dependency caching remains reusable while validation proof stays in immutable artifacts.
- Good: attempt-scoped names and REST metadata checks isolate reruns and prevent wrong-run reuse.
- Tradeoff: Validate owns repository checks, Pages deployment, and the receipt contract; changes to those boundaries require revisiting this decision.
- Risk: missing, expired, malformed, or contradictory hosted evidence fails release readiness closed and requires a fresh successful main push.
