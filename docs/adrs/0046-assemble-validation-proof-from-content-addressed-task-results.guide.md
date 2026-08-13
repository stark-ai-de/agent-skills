# ADR-0046: Assemble validation proof from content-addressed task results

ID: ADR-0046
Title: Assemble validation proof from content-addressed task results
Status: Accepted
Date: 2026-08-13
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, validation, caching, artifacts, provenance
Applies when: Planning, executing, reusing, aggregating, or publishing hosted validation results.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0044
Superseded by: None
Guide verified: 2026-08-13
Gist: A selected validation gate may be satisfied by an exact verified task result while protected main retains current proof and publication authority.

Variants: [Short](0046-assemble-validation-proof-from-content-addressed-task-results.short.md) · [Long, canonical](0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · **Guide**

This guide is non-normative. [Long](0046-assemble-validation-proof-from-content-addressed-task-results.long.md) is authoritative.

## How to apply

- Keep affected selection and execution closure separate. Selection answers whether a gate is required; the execution closure answers whether its result is identical.
- Compute keys from canonical sorted path/type/mode/size/content witnesses and all declared commands, prerequisites, package profiles, tools, environment, Git queries, evidence, outputs, and policy epochs.
- Pass a sanitized allowlisted environment to reusable gate processes. Never store secrets, arbitrary environment values, logs, or absolute runner paths in keys or receipts.
- Use the dependency cache only for a small lookup index. Accept a result only after exact immutable artifact and producer verification.
- Emit one canonical receipt artifact per completed gate job. Store success receipts and failure tombstones; skipped work is neither.
- Restore outputs into a private staging directory, reject unsafe entries, verify the complete tree digest, and atomically replace only the declared output path.
- Keep the required `Validate` aggregator present for empty, full-hit, partial-hit, and cold-miss matrices. It must reject selected gates without exactly one accepted result.
- Let protected main promote verified computation, then create new current Pages and validation artifacts. Do not copy or relabel a pull-request authorization receipt.

## Verification

- Prove key stability across commit SHA/run changes and invalidation for path, type, mode, bytes, command, dependency, prerequisite, environment, toolchain, and policy changes.
- Treat the pinned hosted runner label and its system-tool compatibility contract as the platform key; observe the exact image revision and system executable bytes in every producer without requiring separate jobs in one image rollout to be byte-identical.
- Test missing, expired, malformed, wrong-run, wrong-job, wrong-attempt, wrong-key, wrong-digest, traversal, symlink, hard-link, oversize, duplicate, timeout, and contradictory evidence.
- Verify that a full hit starts no gate process, installs no gate dependencies, restores exact site bytes, and still produces a complete current report.
- Verify that `off` always executes and `verify` detects semantic or output nondeterminism.
- Run hosted cold, exact-hit, verify, partial-invalidation, global-invalidation, and protected-main promotion scenarios against exact revisions.

## Current references

- [GitHub Actions dependency caching](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub Actions workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
- [GitHub Actions artifacts REST API](https://docs.github.com/en/rest/actions/artifacts)

## Revisit

Create a successor if the authoritative store, task-key identity, failure contradiction rule, trust promotion, or Pages/release authorization model changes.
