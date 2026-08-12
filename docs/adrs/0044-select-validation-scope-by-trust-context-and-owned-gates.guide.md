# ADR-0044: Select validation scope by trust context and owned gates

ID: ADR-0044
Title: Select validation scope by trust context and owned gates
Status: Accepted
Date: 2026-08-12
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, ci, validation, artifacts, release
Applies when: Maintaining hosted validation scope, required checks, or trusted validation proof.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0041, ADR-0043
Superseded by: None
Guide verified: 2026-08-12
Gist: Pull requests run a fail-closed union of affected owned gates, while main and manual validation remain full and trusted proof remains full-only.

Variants: [Short](0044-select-validation-scope-by-trust-context-and-owned-gates.short.md) · [Long, canonical](0044-select-validation-scope-by-trust-context-and-owned-gates.long.md) · **Guide**

This guide is non-normative. [Long](0044-select-validation-scope-by-trust-context-and-owned-gates.long.md) is authoritative.

## How to apply

- Keep Validate and its required job unfiltered for pull requests, main pushes, and manual dispatch.
- Treat only pull requests as affected-selection candidates. Main pushes and every manual dispatch select the complete hosted gate set.
- Use the event base SHA and checked-out candidate SHA rather than a provider-truncated changed-file list.
- Execute compatible base planning from files materialized into an exact temporary directory, validate both plans, then union gates and dependency profiles.
- Select full validation on any planning error, unknown ID, global invalidator, unmatched path, or incompatible schema.
- Keep gate commands as argument arrays and reports deterministic. Record every selected gate as passed, failed, or skipped.
- Capture candidate fingerprints before and after all gates. An affected run may upload a diagnostic report but never trusted Pages or release artifacts.
- For trusted-main proof, require receipt schema v2, `validation_scope: full`, the exact manifest full-gate set, matching plan/report digests, successful skills/smoke gates, and the existing attempt-bound artifact identity.

## Verification

- Unit-test path classes, rename/delete parsing, base/candidate union, malformed output, schema mismatch, unknown gates, and unmatched-path fallback.
- Unit-test exact-once runner behavior, deterministic ordering/reporting, prerequisite skips, timeouts, process termination, and mutation rejection.
- Confirm a pull request with no base planner runs full, a later documentation-only pull request remains affected, and all manual events remain full.
- Confirm affected runs cannot satisfy receipt creation or release-readiness predicates.
- Collect Pages deployment and release-proof evidence only after a successful full main push.

## Current references

- [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub pull request events](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#pull_request)
- [GitHub dependency caching](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [pnpm filtering](https://pnpm.io/filtering)

## Revisit

Create a reciprocal successor when the trust-context scope, base/candidate planning rule, stable required-job boundary, full-proof eligibility, or Validate ownership changes materially.
