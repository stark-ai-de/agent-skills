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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0042
Superseded by: None
Guide verified: 2026-08-11
Gist: Make Validate the single trusted producer and handoff for validated main artifacts and release proof.

Variants: [Short](0043-deploy-validated-main-artifacts.short.md) · **Long, canonical** · [Guide](0043-deploy-validated-main-artifacts.guide.md)

## Decision

We will make the required Validate workflow the single trusted producer of validated main artifacts: it will cache only the lockfile-bound pnpm store, upload and deploy the validated Pages artifact in the same run, and publish a SHA-bound receipt that manual release publication must verify before reusing the run.

## Why

- The required Validate workflow already runs the aggregate repository checks and builds the Astro site.
- A separate Pages workflow repeats the site build and can accept manual refs that do not deploy.
- GitHub dependency caches are for regenerable dependencies, not validation proof or deployment output.
- Pages artifacts and validation receipts are immutable workflow outputs and can be tied to a specific run and commit.
- Release publication can avoid rerunning the aggregate suite when the exact successful main push and its receipt are verified.

## Options

- Chosen: Keep required validation unfiltered, cache only the lockfile-bound pnpm store, upload the validated Pages artifact and receipt from the same main run, and deploy from a dependent job.
- Rejected: Keep a separate Pages build workflow, because it duplicates the site build and creates an unnecessary build-only dispatch path.
- Rejected: Use workflow_run for automatic handoff, because it introduces a privileged cross-workflow boundary and artifact-security risk.
- Rejected: Cache node_modules, site output, or validation receipts, because those files are regenerable outputs rather than safe dependency-cache material.
- Rejected: Extract a broad reusable workflow, because it reduces YAML duplication without removing aggregate validation work.

## Consequences

- Good: One validated site build supplies the Pages deployment, stale validation runs are reduced, and release readiness reuses exact proof.
- Good: Manual release publication can verify workflow, event, branch, run, SHA, version, and receipt identity before writing a tag.
- Tradeoff: Validate owns repository checks and the trusted main deployment handoff.
- Tradeoff: Pages and receipt artifacts must be retained long enough for the manual release window.
- Risk: A future workflow change that weakens the receipt or artifact boundary must update this decision and its validation.

## Follow-up

- Revisit aggregate validation parallelism only after measuring runner-minute cost and wall-clock savings.
- Revisit full commit-SHA pinning for third-party actions as a separate supply-chain hardening decision.
