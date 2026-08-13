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
Variant: Short
Canonical variant: Long
Supersedes: ADR-0044
Superseded by: None
Guide verified: 2026-08-13
Gist: A selected validation gate may be satisfied by an exact verified task result while protected main retains current proof and publication authority.

Variants: **Short** · [Long, canonical](0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · [Guide](0046-assemble-validation-proof-from-content-addressed-task-results.guide.md)

## Decision

We will model hosted validation as a versioned content-addressed task graph. The required `Validate` check will remain stable and always conclude through one current-run aggregator. Each selected gate will be satisfied exactly once by either a current successful execution or one verified reusable successful task result; a cache hit is not represented as an execution. Pull-request affected selection and full logical validation for main and manual contexts remain, but full logical validation no longer requires every unchanged task to execute again.

Every reusable task will declare an execution input closure separately from its affected-selection paths. Its key will bind the repository identity, key and gate epochs, gate and engine contracts, canonical path/type/mode/size/content witnesses, expanded command, dependency profiles, prerequisite task keys, sanitized environment, exact toolchain and platform identity, and evidence or restorable-output contract. Commit SHA, workflow run identity, timestamps, and duration will not be key inputs. Missing, ambiguous, ambient, or unverifiable inputs will make the task ineligible for reuse.

GitHub Actions cache will be only an untrusted disposable lookup index. Immutable workflow artifacts will hold authoritative canonical task receipts and declared outputs. Consumers will recompute keys and strictly verify artifact ID and digest, producer repository/workflow/run/attempt/job metadata, completion and conclusion, control-plane identity, receipt schema, evidence, output tree, and prerequisite chain before accepting a result. A newer eligible failed execution will tombstone an older success for the same task key and trust scope; current execution failure will never fall back to prior success.

Computation evidence and publication authority will remain separate. A pull-request result may be reused by a protected-main run only when the producer's validation control plane and complete task identity exactly match current protected main. The current protected-main aggregator alone will assemble current full Pages or release proof, reconstitute and rehash any reusable site output, create the current Pages artifact, and issue the current validation receipt. Pull requests will remain unprivileged and unable to deploy or publish. Release readiness and publication will recursively verify every unique producer represented by the current proof.

The workflow will expose `validation_reuse` modes `auto`, `off`, and `verify`. `auto` will accept verified hits and execute misses, `off` will force execution, and `verify` will re-execute would-be hits and compare semantic evidence and output digests. Storage absence, expiry, lookup limits, or ordinary unavailable metadata will become a miss; malformed or contradictory proof, impossible identity, unsafe archive content, or digest mismatch will fail closed. A namespace or gate epoch change and `off` mode will provide immediate rollback without deleting stored artifacts.

## Context

The previous decision required every selected gate to execute and deliberately excluded prior results from current proof. Hosted evidence showed that repeated deterministic Architecture Compass work dominated runtime while the existing dependency cache contributed little. This successor keeps the same logical validation and publication boundaries but permits exact task evidence to satisfy them.

## Consequences

- Good: Exact and cross-commit task hits can remove gate execution and dependency installation.
- Good: Protected main still owns current Pages and release authorization.
- Tradeoff: Complete input closures and strict provenance become maintained contracts.
- Risk: A missing input could admit stale evidence, so ambiguity fails to execution and contradictions fail closed.
