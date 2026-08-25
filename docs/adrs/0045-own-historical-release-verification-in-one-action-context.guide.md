# ADR-0045: Own historical release verification in one action context

ID: ADR-0045
Title: Own historical release verification in one action context
Status: Accepted
Date: 2026-08-22
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, historical-release, release-verification, workflow-context
Applies when: Verifying release subjects against historical tags or post-release evidence.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-22
Gist: One composite-action context must own historical tag checkout, helper restoration, and current or legacy release-output normalization.

Variants: [Short](0045-own-historical-release-verification-in-one-action-context.short.md) · [Long, canonical](0045-own-historical-release-verification-in-one-action-context.long.md) · **Guide**

This guide is non-normative. [Long](0045-own-historical-release-verification-in-one-action-context.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Capture the current workflow and receipt helper closure before checking out a tag.
2. Resolve the exact tag and check out the resolved commit without rewriting historical tags.
3. Restore the captured current helpers into the post-checkout execution seam.
4. Run the tag-bound packaging and normalize current or legacy evidence at the action boundary.
5. Keep `post-release-evidence.yml` and `attest-release.yml` as callers that pass inputs and consume outputs.
6. Return `not_applicable` for the supported `v0.19.1` subject comparison rather than requiring new code in that tag.

## Verification

- Run `npm run test:post-release-receipt` and `npm run lint:actions`.
- Exercise a temporary tag fixture for clean, dirty, and invalid tag states.
- Confirm the summary helper is present after checkout and that the caller sees one normalized output shape.
- Confirm a failed tag resolution or unsafe state blocks the historical proof.

## Current references

- The historical composite action, `post-release-evidence.yml`, `attest-release.yml`, tag resolver, and post-release receipt tests are the owning implementation boundaries.
- Historical evidence remains distinct from current release and publication proof even when the same action normalizes both shapes.

## Revisit

Create a new ADR that supersedes this record if historical verification needs multiple action contexts, changes its compatibility result, or moves helper preservation back into workflow-specific ownership.
