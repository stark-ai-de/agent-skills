# ADR-0015: Prepare releases in change PRs

Status: Accepted
Date: 2026-05-24
Owner: stark-ai-de
Gist: Release metadata should travel with the public catalog change it releases.

## Decision

We will prepare package and changelog release changes in the same pull request that changes public skills, then publish manually from `main`.

## Why

- Per-skill versions are independent and can stay below the repository package version.
- Public skill additions, removals, and version increases change the repository catalog release.
- A separate prepare workflow splits related review state from the catalog change.

## Options

- Chosen: Review skill, package, and changelog release updates together.
- Rejected: Generated prepare-release PRs, because they split release state.
- Rejected: Auto-publish on merge, because tags still need maintainer approval.

## Consequences

- Good: PR validation checks one coherent release contract.
- Tradeoff: Contributors must prepare release metadata before merging public skill changes.
- Risk: None known.

## Follow-up

- Keep `Publish Release` manual and guarded.
