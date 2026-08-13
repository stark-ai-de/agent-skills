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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0044
Superseded by: None
Guide verified: 2026-08-13
Gist: A selected validation gate may be satisfied by an exact verified task result while protected main retains current proof and publication authority.

Variants: [Short](0046-assemble-validation-proof-from-content-addressed-task-results.short.md) · **Long, canonical** · [Guide](0046-assemble-validation-proof-from-content-addressed-task-results.guide.md)

## Decision

We will model hosted validation as a versioned content-addressed task graph. The required `Validate` check will remain stable and always conclude through one current-run aggregator. Each selected gate will be satisfied exactly once by either a current successful execution or one verified reusable successful task result; a cache hit is not represented as an execution. Pull-request affected selection and full logical validation for main and manual contexts remain, but full logical validation no longer requires every unchanged task to execute again.

Every reusable task will declare an execution input closure separately from its affected-selection paths. Its key will bind the repository identity, key and gate epochs, gate and engine contracts, canonical path/type/mode/size/content witnesses, expanded command, dependency profiles, prerequisite task keys, sanitized environment, exact toolchain and platform identity, and evidence or restorable-output contract. Commit SHA, workflow run identity, timestamps, and duration will not be key inputs. Missing, ambiguous, ambient, or unverifiable inputs will make the task ineligible for reuse.

GitHub Actions cache will be only an untrusted disposable lookup index. Immutable workflow artifacts will hold authoritative canonical task receipts and declared outputs. Consumers will recompute keys and strictly verify artifact ID and digest, producer repository/workflow/run/attempt/job metadata, completion and conclusion, control-plane identity, receipt schema, evidence, output tree, and prerequisite chain before accepting a result. A newer eligible failed execution will tombstone an older success for the same task key and trust scope; current execution failure will never fall back to prior success.

Computation evidence and publication authority will remain separate. A pull-request result may be reused by a protected-main run only when the producer's validation control plane and complete task identity exactly match current protected main. The current protected-main aggregator alone will assemble current full Pages or release proof, reconstitute and rehash any reusable site output, create the current Pages artifact, and issue the current validation receipt. Pull requests will remain unprivileged and unable to deploy or publish. Release readiness and publication will recursively verify every unique producer represented by the current proof.

The workflow will expose `validation_reuse` modes `auto`, `off`, and `verify`. `auto` will accept verified hits and execute misses, `off` will force execution, and `verify` will re-execute would-be hits and compare semantic evidence and output digests. Storage absence, expiry, lookup limits, or ordinary unavailable metadata will become a miss; malformed or contradictory proof, impossible identity, unsafe archive content, or digest mismatch will fail closed. A namespace or gate epoch change and `off` mode will provide immediate rollback without deleting stored artifacts.

## Why

- Repeating deterministic validation for identical task inputs wastes most hosted time while dependency caching saves only seconds.
- A complete content identity is more precise than commit identity and permits safe reuse across unrelated commits.
- Separating an untrusted locator from immutable authoritative proof avoids treating dependency-cache bytes as validation evidence.
- A current protected-main aggregator preserves Pages and release authorization even when computation originated in a lower-trust run.
- One deep task-graph module keeps key, trust, extraction, and proof policy out of workflow YAML.

## Options

- Chosen: Repository-owned task graph with GitHub cache as a hint and immutable GitHub artifacts as authoritative results.
- Rejected: Cache by commit SHA only, because it cannot reuse unaffected task inputs across commits and does not bind commands, tools, or environment.
- Rejected: Treat `actions/cache` contents as proof, because cache entries are branch-scoped, unsigned, unverified, evictable, and unsuitable as an authorization boundary.
- Rejected: Adopt a general monorepo remote-cache service, because repository proof still needs GitHub run, job, attempt, artifact, Pages, and release provenance that those services do not supply.
- Rejected: Reuse a pull-request aggregate directly for publication, because computation success does not grant protected-main deployment or release authority.

## Consequences

- Good: Identical inputs can skip gate processes and dependency installation while retaining a complete current validation result set.
- Good: Partial changes execute only invalidated task closures and immutable task artifacts survive later failures in unrelated tasks.
- Good: Reports distinguish `executed` and `reused` and retain auditable producer provenance.
- Tradeoff: Every gate needs a maintained complete transitive input, tool, environment, evidence, and output declaration.
- Tradeoff: Artifact discovery, strict extraction, tombstones, and recursive release verification add control-plane code and hosted API traffic.
- Risk: An incomplete task input closure could accept stale evidence; undeclared-read audits, conservative misses, per-gate epochs, and protected-main verification mitigate it.
- Risk: Artifact expiry or cache-index races can reduce hit rate; they cannot create success because unavailable proof executes fresh.

## Follow-up

- Record hosted cold, exact-hit, verify, partial-invalidation, global-invalidation, and post-merge protected-main evidence.
- Revisit retention and lookup bounds only from measured hosted hit rate, storage use, and API latency.
