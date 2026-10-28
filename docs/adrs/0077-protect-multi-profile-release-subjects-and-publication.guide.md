# ADR-0077: Protect multi-profile release subjects and publication

ID: ADR-0077
Title: Protect multi-profile release subjects and publication
Status: Accepted
Date: 2026-10-28
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, github-actions, artifacts, approvals, evidence
Applies when: Preparing, publishing, repairing or verifying a stable multi-profile catalog release.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0050
Superseded by: None
Guide verified: 2026-10-28
Gist: Protected publication binds all profile archives and their independent handoffs to one reviewed release revision.

Variants: [Short](0077-protect-multi-profile-release-subjects-and-publication.short.md) · [Long, canonical](0077-protect-multi-profile-release-subjects-and-publication.long.md) · **Guide**

This guide is non-normative. [Long](0077-protect-multi-profile-release-subjects-and-publication.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Prepare the generated release PR, validate all three archives and the versioned subject, then run readiness and protected reconciliation. Preserve existing releases and use a separately digest-bound handoff for each existing listing.

## Verification

Run release-subject, reconciliation, historical, provenance and post-release checks, plus the repository release aggregate. Check exact hosted artifacts and attestations before either manual portal handoff.

## Current references

- [Repository publishing process](../publishing.md).
- [OpenAI plugin submission](https://developers.openai.com/plugins/deploy/submission).

## Revisit

Create a new reciprocal successor ADR if this decision changes; preserve locked predecessor decision text.
