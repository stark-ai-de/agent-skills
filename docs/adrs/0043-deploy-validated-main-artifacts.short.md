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
Variant: Short
Canonical variant: Long
Supersedes: ADR-0042
Superseded by: None
Guide verified: 2026-08-11
Gist: Make Validate the single trusted producer and handoff for validated main artifacts and release proof.

Variants: **Short** · [Long, canonical](0043-deploy-validated-main-artifacts.long.md) · [Guide](0043-deploy-validated-main-artifacts.guide.md)

## Decision

We will make the required Validate workflow the single trusted producer of validated main artifacts: it will cache only the lockfile-bound pnpm store, upload and deploy the validated Pages artifact in the same run, and publish a SHA-bound receipt that manual release publication must verify before reusing the run.

## Context

- The required Validate workflow already builds the Astro site.
- A separate Pages workflow repeats that build and can run for refs that never deploy.
- Release readiness needs an auditable proof boundary tied to the exact successful main push.

## Consequences

- Good: The validated Pages artifact is deployed without a second build, and release publication reuses exact proof.
- Tradeoff: Validate owns both repository checks and the trusted main deployment handoff.
- Risk: A workflow change that weakens receipt identity or artifact ownership can invalidate release proof.
