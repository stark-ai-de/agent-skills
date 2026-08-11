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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-11
Gist: Validate owns trusted main artifact production and deployment, while release publication reuses exact attempt-bound proof.

Variants: [Short](0042-optimize-github-actions-with-owned-gates.short.md) · [Long, canonical](0042-optimize-github-actions-with-owned-gates.long.md) · **Guide**

This guide is non-normative. [Long](0042-optimize-github-actions-with-owned-gates.long.md) is the authoritative decision; if this guidance conflicts with Long, follow Long.

## How to apply

- Keep `Validate` unfiltered for pull requests, every `push` to `main`, and manual dispatch. Compute one `trusted_main` output from the event and ref, then reuse that output for the site digest, Pages configuration, Pages upload, receipt creation, and deployment conditions.
- Run the repository aggregate, formatter, linter, skill discovery, and smoke install before producing a trusted main artifact. Capture the exact candidate fingerprint and file count immediately before the gates, from the smoke-copy output, and immediately after; fail if any value differs.
- Normalize `SKILLS_SMOKE_CLI` to `unset` or `configured` and `SKILLS_SMOKE_FORCE_TTY` to `0` or `1` in the receipt. Never publish an override path. Record the CLI version used by the smoke command.
- Name the Pages artifact `github-pages-<GITHUB_RUN_ID>-<GITHUB_RUN_ATTEMPT>` and the receipt artifact `validation-receipt-<GITHUB_RUN_ID>-<GITHUB_RUN_ATTEMPT>`. Expose both names as Validate job outputs and record their names plus Pages artifact ID in the receipt.
- Upload and deploy Pages, and publish the trusted-main receipt, only when `trusted_main` is true. A pull request or manual dispatch from another branch may complete validation but must not create a Pages artifact or deployment.
- In `Publish Release`, select a completed successful `Validate` run for the exact SHA with event `push`, branch `main`, and its current run attempt. Derive the expected attempt-scoped names, query REST metadata, reject expired or ambiguous artifacts, download by explicit run ID and name, and verify the receipt fields symmetrically.
- Recompute the candidate fingerprint on the checked-out SHA as a focused identity check, run release-specific validation only, and verify `main` has not advanced before publication. Do not rerun the aggregate suite or treat the pnpm cache as proof.

## Verification

- Locally run `npm run lint:actions`, `npm run validate:adrs`, `pnpm format:check`, `pnpm lint`, and `git diff --check` for the changed contracts.
- Confirm static invariants: no changed ADR is `Superseded`; ADR-0041 and ADR-0042 references use complete Short/Long/Guide links; the trusted-main predicate appears once; artifact names contain both run ID and attempt; receipt and release checks cover the same identity fields.
- After merge, collect hosted evidence for cache hits, PR/no-deploy behavior, main push and manual-main deployment, manual non-main validation-only behavior, rerun attempt isolation, release dry-run acceptance, malformed/missing/expired proof rejection, wrong event/branch/SHA rejection, and advanced-main rejection. Actual publication remains a maintainer action.
- Treat local checks as source/static or local evidence and hosted runs, Pages deployment, and release dry runs as separate CI/deployed or publication-stage receipts.

## Current references

- [GitHub dependency caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [GitHub workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
- [GitHub concurrency](https://docs.github.com/en/actions/using-workflows/using-concurrency)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub REST workflow runs](https://docs.github.com/en/rest/actions/workflow-runs)
- [GitHub REST artifacts](https://docs.github.com/en/rest/actions/artifacts)

## Revisit

Create a reciprocal successor when Validate ownership, the artifact boundary, the cache boundary, event/ref deployment contract, or release-proof contract changes materially. Preserve ADR-0042 and replace it rather than rewriting an accepted decision.
