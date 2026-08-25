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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-22
Gist: One composite-action context must own historical tag checkout, helper restoration, and current or legacy release-output normalization.

Variants: [Short](0045-own-historical-release-verification-in-one-action-context.short.md) · **Long, canonical** · [Guide](0045-own-historical-release-verification-in-one-action-context.guide.md)

## Decision

Historical release verification will run through one repository-owned composite action context that captures the current workflow contract before tag checkout, resolves and checks out the requested exact tag, restores the current release helpers needed after checkout, and normalizes current and legacy outputs into one caller-facing contract. `post-release-evidence.yml` and `attest-release.yml` remain thin callers. The supported historical `v0.19.1` path remains explicitly `not_applicable` where the current subject contract does not apply, and it must not require new tag code.

## Why

- A single action seam prevents each workflow from inventing a different preservation set or legacy fallback.
- Capturing before checkout ensures that current workflow behavior remains available even when the tag predates the helper.
- Exact tag resolution keeps historical proof bound to the intended release identity.
- An explicit `not_applicable` result preserves compatibility for `v0.19.1` without making old tags satisfy a contract they never contained.

## Options

- Chosen: Use one composite action for capture, exact tag checkout, helper restoration, and output normalization, with thin workflow callers.
- Rejected: Duplicate preservation and normalization in each workflow, because the action paths would drift and ownership would be ambiguous.
- Rejected: Require every historical tag to contain the current helper set, because that changes the historical verification contract and breaks supported legacy tags.
- Rejected: Treat every tag checkout as a current release proof, because historical and current evidence have different contract stages.

## Consequences

- Good: Historical verification has one visible owner and one caller-facing output contract.
- Good: The current summary helper remains available after checking out an old tag.
- Tradeoff: The composite action's captured helper set must be updated whenever its current contract changes.
- Risk: Incorrect tag resolution or permissive fallback could bind evidence to the wrong source; exact-tag and fixture checks must fail closed.

## Follow-up

- Keep this ADR accepted while implementing and verifying the historical-context extraction.
- Add a temporary tag fixture covering clean, dirty, and invalid tag states.
- Keep `v0.19.1` explicitly `not_applicable` for the new subject comparison and avoid adding new tag-specific code.
- Create a reciprocal successor if the action seam, historical compatibility, or caller ownership changes materially.
