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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-22
Gist: One composite-action context must own historical tag checkout, helper restoration, and current or legacy release-output normalization.

Variants: **Short** · [Long, canonical](0045-own-historical-release-verification-in-one-action-context.long.md) · [Guide](0045-own-historical-release-verification-in-one-action-context.guide.md)

## Decision

Historical release verification will run through one repository-owned composite action context that captures the current workflow contract before tag checkout, resolves and checks out the requested exact tag, restores the current release helpers needed after checkout, and normalizes current and legacy outputs into one caller-facing contract. `post-release-evidence.yml` and `attest-release.yml` remain thin callers. The supported historical `v0.19.1` path remains explicitly `not_applicable` where the current subject contract does not apply, and it must not require new tag code.

## Context

Tag checkouts can replace the helper files that the current workflow needs to interpret historical evidence. If each workflow preserves files and normalizes outputs independently, the two paths can drift and a historical result can be mistaken for current proof.

## Consequences

- Good: Tag resolution, helper preservation, and legacy normalization have one owning seam.
- Tradeoff: The composite action must maintain a closed helper set and a stable caller-facing output contract.
- Risk: A fixture or tag edge case could be hidden by over-broad fallback; clean, dirty, and invalid tag states must remain distinguishable.
