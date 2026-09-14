---
title: "Architecture Compass: Reviewed Measurable Testing ADR Drafts"
slug: "architecture-compass-measurable-testing-adr-drafts"
artifact_path: "docs/specs/architecture-compass-measurable-testing-adr-drafts-spec.md"
mode: "deep"
status: "approved"
owner: "stark-ai-de"
created: "2026-09-13"
updated: "2026-09-14"
---

# Architecture Compass: Reviewed Measurable Testing ADR Drafts

Companion to the [integration specification](architecture-compass-measurable-testing-adr-set-spec.md). These triplets preserve the design accepted for provider integration on 2026-09-14. Installed canonical Longs under the skill references own live provider policy; target repositories still require native adoption or adaptation.

## Extraction and acceptance contract

For each draft below, create three files only after the integration approval gate: the listed stem plus `.short.md`, `.long.md`, `.guide.md`. Begin each with `# <ID>: <Title>` from its shared metadata, repeat that metadata unchanged, and insert `Variant: Short`, `Variant: Long` or `Variant: Guide` immediately before `Canonical variant`. Add the repository's exact direct sibling navigation.

Copy only the selected variant's body below that navigation: omit the `### Short`, `### Long` or `### Guide` wrapper and promote its `####` body headings to `##`. Each Short includes `Decision summary`; each Long includes `Context`, `Decision` and `Consequences` alongside its intent, invariants, measurement, evidence, exception and revisit sections. Preserve the supplied body text through extraction. Long is canonical; Short may not relax it; Guide is non-normative. Shared metadata here is an editorial convenience, not a fourth policy variant.

IDs 059–062 were allocated after rechecking the 58-record baseline and accepted on 2026-09-14. Preserve all pre-existing accepted identities and decisions; future changes follow the normal acceptance and successor process. Each draft's repository-ADR lineage disposition is `independent` with `relations: []`: it supplements existing provider decisions but is not claimed to derive from a specific repository ADR. Keep that disposition in the repository-only manifest; omit lineage declarations from independent Guides under accepted AC-ADR-044. Update the disposition only if actual derivation changes during review.

The integration preserves the Accepted/Superseded gate. The following extraction recipe documents the reviewed conversion; approval and ID allocation have now completed. The integration specification retains the required evaluation, lock, catalog and installation proof.

## AC-ADR-059 — Own repository validation through discoverable framework tests

Stem: `ac-adr-059-own-repository-validation-through-discoverable-framework-tests`

### Shared metadata

```text
ID: AC-ADR-059
Title: Own repository validation through discoverable framework tests
Status: Accepted
Date: 2026-09-14
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, validation, ownership, discoverability, migration
Applies when: Adding or migrating repository-maintenance checks that assert configuration, source, documentation, generated-output or release contracts.
Adoptable: true
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Make contract failures attributable and discoverable without retaining an unowned script-driven validation system.
```

### Short

#### Decision summary

Move repository-maintenance contract assertions and their lifecycle into the selected test framework. Inventory rules and call sites by behavior, preserve positive and negative semantics, and complete the migration with zero unowned bare validation entrypoints. Keep native tool gates, operational commands and reusable production/domain validation logic under their legitimate owners. Do not merely wrap old validator processes or recreate a scheduler/reporter.

Prove current inputs, including additions/deletions and file-read dependencies, reach the right tests. Record intent, scope, rule coverage, diagnostics, feedback targets and evidence in target-native receipts. Unknown coverage is not success. Promote the anti-regression guard gradually with tested exceptions; resolve conflicts and waivers explicitly. Revisit when contract ownership or discovery changes.

### Long

#### Context

Repository-maintenance checks can distribute assertions and orchestration across standalone scripts, package commands and CI calls. That makes ownership and selective execution hard to discover, while a migration can accidentally lose warning, failure or input-discovery behavior.

#### Intent

Make every repository rule easy to find, run selectively and diagnose, while retaining the assurance supplied by the previous checks. Success is complete owned validation with useful feedback, not a chosen filename extension or an increased number of tests.

#### Decision

A target SHALL express repository-maintenance contract assertions as discoverable tests in its selected framework, with that framework owning selection, lifecycle, failure propagation and reports. For JS/TS, select the runtime/tooling profile under the applicable local mapping of AC-ADR-058 and its runtime evidence rules. Other language or framework owners remain valid adaptations.

Before migration, inventory all in-scope rules, data inputs and live invocations, including validator-only `verify` commands, generator check modes and standalone assertion harnesses. Map each rule to a named test boundary or explicitly justified native/operational owner. Preserve semantic warnings, failures, cleanup and representative negative cases before deleting the old entrypoint.

“The test is the validator” prohibits an unframed repository validation system, not ordinary code reuse. Shared schemas, domain functions, parsers, reusable assertions, structured diagnostics and public/runtime validation APIs MAY remain importable. Production input/security guards MUST NOT be removed. Native lint/typecheck/build tools retain their gates; generators retain their real artifact-producing purpose. A whole old validator launched as one opaque test, or a custom runner hidden under Vitest, is not migration completion.

#### Invariants

- Every applicable rule has an owner and a selectable execution path; no retired validator remains as a competing supported path without an owned transition exception.
- Tests detect changes to their current input set, including new, removed or renamed files; missing required roots and unexpected empty inventories cannot quietly pass.
- Import-graph filtering alone is insufficient for plain file reads. Selection and watch behavior must cover those dependencies or conservatively select the owning suite.
- Helpers do not validate the checkout, exit the process or launch a runner merely because they are imported.
- Framework discovery and positive/negative failure behavior, not filenames alone, establish ownership.

#### Measurable outcomes

Completion requires `mapped_in_scope_rules / all_in_scope_rules = 1`, zero unowned live validator entrypoints, and detection of every declared negative scenario. Freeze and identify the input/rule inventory for each run; a zero denominator is explicitly not applicable, not 100 percent coverage. Track focused feedback time and diagnostic quality using a defined malformed fixture and target-approved latency budget.

#### Adoption evidence

Record the local/provider mapping, intended user benefit, scope and exclusions, baseline subject/inventory, measurement command, unit/denominator, target, observed value, owner, enforcement stage and review trigger. Preserve original intent when adapting tools. Separate governance adoption from rollout completion and achieved metrics. Unmeasured or waived obligations cannot be represented as passed.

#### Failure and exceptions

Missing mapping or semantic regression blocks completion. Preserve a reviewed transition path until parity exists. Promote a no-bare-validator guard through AC-ADR-018's evidence stages; test allowed operational APIs as well as forbidden cases. Exceptions identify scope, authority, owner, expiry/revisit and replacement proof. Historical prose, comments and production validators are not violations merely because their names match a search expression.

#### Revisit

Reassess on new contract domains, changed source discovery, schema ownership, native tool integration or a material diagnosis/feedback regression. Use the local successor process for a changed accepted decision.

#### Consequences

Framework ownership gives repository rules a discoverable execution and reporting path. Migration requires a maintained rule/input inventory and semantic parity evidence; shared domain logic and native tool gates continue under their existing owners.

### Guide

This Guide is non-normative; the Long controls.

Begin with package/workspace scripts, workflow calls and executable behavior, not a `validate-*` filename count. Build a small rule-to-test mapping. Use focused `describe`/`test` cases, deterministic current-data enumeration and minimal fixture builders. Import shared domain logic when useful; do not run every old CLI as a one-line wrapper test.

For the Vitest 4 profile, name disjoint projects and use explicit inheritance. Add global watch mappings for Markdown/JSON/YAML read through filesystem APIs. Check add/delete/rename as well as edits; affected-check selection may need a separate input ownership map. Keep a target-native typecheck command where applicable.

A migration receipt should show rule mapping coverage, old/new representative outcomes, diagnostic output for malformed input, and measured focused feedback time. An independent expected inventory prevents a broken enumerator from defining its own passing expectation.

Verification examples: a missing required schema fails; a newly added invalid file is collected; a release CLI continues to work without importing Vitest; the guard permits a public schema validator but rejects an auto-running repository check. No observed baseline means no improvement claim.

#### Related decisions

Use AC-ADR-018 for enforcement stages, AC-ADR-021/022 for migration and delivery, AC-ADR-049 for validation evidence and AC-ADR-058 for applicable runtime/tooling selection.

#### Sources

Current API references: [V4 projects](https://v4.vitest.dev/guide/projects), [watch mappings](https://v4.vitest.dev/config/watchtriggerpatterns), [type testing](https://v4.vitest.dev/guide/testing-types).

## AC-ADR-060 — Isolate test execution by effects and runtime contracts

Stem: `ac-adr-060-isolate-test-execution-by-effects-and-runtime-contracts`

### Shared metadata

```text
ID: AC-ADR-060
Title: Isolate test execution by effects and runtime contracts
Status: Accepted
Date: 2026-09-14
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, isolation, runtime-evidence, concurrency, hermeticity
Applies when: Tests share mutable resources, spawn processes, access external systems or exercise runtime-specific behavior.
Adoptable: true
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Keep parallel test results representative and independent by owning their runtime and side effects.
```

### Short

#### Decision summary

Assign each test lane explicit runtime, state, I/O, concurrency and cleanup contracts. Preserve native tool/runtime ownership and prove required product behavior in a representative runtime, not just the harness. Repository-conformance tests remain read-only; negative cases use uniquely owned disposable resources. No hidden retries, unexpected external access or shared-state coupling may manufacture success.

Record actual runtime evidence, sequential/concurrent outcomes, cleanup and network enforcement limits, feedback/cost budgets and target-native adoption measurements. Start conservatively and relax isolation only after representative proof. Report missing evidence, leaks and expiring exceptions explicitly; revisit on runtime, topology or resource changes.

### Long

#### Context

Parallel tests can couple through files, ports, databases, environment state and child processes even when their modules are isolated. A passing harness also does not establish product compatibility when the harness and product use different runtimes.

#### Intent

Make validation repeatable under realistic parallel execution without corrupting developer state or confusing a harness pass with product compatibility. Faster feedback is useful only when the same contracts still fail and pass for the same reasons.

#### Decision

Each execution lane SHALL declare the contract it proves, harness/worker and product runtime boundaries, allowed I/O, mutable resources, maximum concurrency, timeouts and cleanup owner. Group tests by materially different effects or environments; do not create arbitrary empty projects. Choose candidates and fallbacks under existing runtime decisions, including AC-ADR-058 where adopted.

A harness runtime is not automatically the production runtime. A required browser, Bun, Node or other platform behavior SHALL have representative boundary proof for that platform. A fallback records its exact affected command, incompatibility or regression evidence, selected supported path and revisit trigger. Actual runtime identities must be observable where a compatibility claim depends on them.

#### Invariants

- Positive repository-conformance tests do not mutate the real checkout or Git index. Negative/mutating cases own disposable locations or isolated services with unique namespaces.
- Fork/module isolation is not a filesystem, network or security sandbox. Shared files, ports, databases and environment resources have separate ownership and reset rules.
- Child processes have bounded execution, cancellation and cleanup. Global clock/randomness/environment changes are controlled and restored even on failure.
- Deterministic lanes do not depend on unapproved external network state. External/production-like tests remain separately identified and retain required gates; a local stub is not external compatibility proof.
- Automatic retries are disabled unless retry behavior is under test. Quarantines and waivers remain visible under the existing enforcement policy.
- Resource limits account for nested workers and concurrent project/CI processes; “all cores” in every process is not a capacity plan.

#### Measurable outcomes

For the declared qualification set, require zero unauthorized checkout/index/shared-state writes, zero unexpected network events where observable, successful cleanup for every injected failure, and zero unexplained outcome differences between supported sequential and parallel runs. State the number of cases, seeds and repeats; this is bounded evidence, not proof that flakiness is impossible. Required runtime boundaries have complete owned coverage or an explicit unmet obligation.

Measure lane feedback time, memory, runner cost and flake frequency against target-approved budgets. Relaxed isolation or greater concurrency must improve the intended budget without violating the correctness metrics.

#### Adoption evidence

Keep a target-native record of provider/local identity, user intent, lane/input scope, runtime matrix, enforced versus instructed restrictions, baseline workload, sample method, metric units/denominators, approved targets, observed results, evidence stage, owner and review trigger. A runtime or enforcement capability not observed is unknown, not successful. Adoption does not certify performance or compatibility. Unmeasured outcomes are not passed.

#### Failure and exceptions

Leaks, incomplete cleanup, unhandled errors and unsupported required runtime behavior block the affected lane's promotion. Preserve other independent proof but do not replace a required external gate with an offline pass. Exceptions require owned scope, reason, bounded duration/revisit and alternative evidence. Do not change a protected product requirement to make a harness pass.

#### Revisit

Requalify on runtime/framework changes, a new operating system, pool changes, new native dependencies, external service changes or changed concurrency/resource topology.

#### Consequences

Explicit lane contracts make state leaks, runtime gaps and concurrency regressions attributable. Qualification adds fixture and measurement work, while conservative isolation may cost time or memory; any relaxation remains tied to representative correctness and benefit evidence.

### Guide

This Guide is non-normative; the Long controls.

For V4, start process-sensitive suites with `pool: "forks"`, `isolate: true` and explicit per-process worker limits. Pure suites may use threads or reduced isolation only after measurement and leakage tests. Use actual process identities from the parent, workers and required product probes; a package-script name is not runtime evidence.

Separate local filesystem/loopback fixtures from genuinely external services. Where a hermeticity claim is required, use an enforced runner/container/network boundary and record its scope. A mocked HTTP client alone does not constrain subprocess network calls. Clean up children and resources in failure paths; exercise cancellation and timeout cases.

Qualification examples: repeated runs with fixed and varied recorded seeds; malformed input after a successful run; concurrent jobs with distinct fixture roots; child-process timeout; database namespace leak; a Bun-only product API with Node-hosted orchestration. Record observed results rather than inventing a fixed universal test-count threshold.

#### Related decisions

Use AC-ADR-018 for owning-boundary proof and AC-ADR-013/014/058 for applicable toolchain and runtime selection.

#### Sources

Current references: [V4 performance/isolation](https://v4.vitest.dev/guide/improving-performance), [Bun runtime selection](https://bun.sh/docs/runtime).

## AC-ADR-061 — Shard tests as complete fail-closed evidence sets

Stem: `ac-adr-061-shard-tests-as-complete-fail-closed-evidence-sets`

### Shared metadata

```text
ID: AC-ADR-061
Title: Shard tests as complete fail-closed evidence sets
Status: Accepted
Date: 2026-09-14
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, sharding, ci, evidence-integrity, performance
Applies when: A required test obligation is distributed across workers, machines, platforms or independently reported jobs.
Adoptable: true
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Reduce feedback latency through measured parallelism without allowing partial or mismatched evidence to pass.
```

### Short

#### Decision summary

Distribute tests only as an identity-bound, complete partition of the selected proof obligation. Define the expected inventory independently, match every result to subject/configuration/runtime/platform/run attempt, and require all mandatory outcomes and predecessors. Missing, extra, overlapping, stale, foreign, failed or unexpectedly skipped evidence cannot produce green.

Measure end-to-end feedback and total runner cost before selecting shard and worker counts; four shards are a candidate, not policy. Preserve separate artifact/environment owners and required-check identity. Record targets, partition proof, adversarial merge cases and observations in local receipts. Unmeasured speedup is not success; use an unsharded equivalent or stop on incomplete evidence.

### Long

#### Context

Distributing tests across independently reported jobs can shorten feedback, but report counts and successful individual jobs do not establish a complete required verdict. Setup, transfer and aggregation costs can also outweigh the time saved by additional shards.

#### Intent

Shorten the time to a trustworthy required verdict without losing test coverage, increasing cost beyond an approved limit or accepting incomplete distributed evidence. The desired outcome is faster complete proof, not simply more jobs.

#### Decision

A distributed test run SHALL define one expected proof set and aggregate results only when they form a complete, attributable partition for that set. Its identity includes source commit or exact working-tree/artifact digest, framework/configuration/lockfile identity, project/runtime/platform, selected test and data inventories, run ID and attempt. Platform/runtime matrix lanes are separate partitions; intentional execution in multiple required environments is not an accidental duplicate.

A plan or documented deterministic rule SHALL define expected membership independently of successful result files. Each shard reports its assigned inventory, actual completed cases and outcomes, execution identity and exit state through native reports plus minimal tested identity metadata where needed. Counts alone do not prove coverage.

#### Invariants

- Within each partition, the union of shard file identities equals the expected set and intersections are empty. Case counts/identities and input coverage reconcile where applicable, including dynamic data-driven cases and intentional skips.
- No expected case may disappear after collection, and failed, errored, unexpectedly skipped or unfinished cases cannot become a passing required obligation.
- Missing, extra, overlapping, duplicate, foreign, stale or malformed evidence is rejected. Evidence from different attempts cannot be mixed silently; any deliberate partial-rerun policy must establish an equivalent complete subject-bound set.
- Required predecessor failures, cancellations and unexpected job skips prevent a successful aggregate even when some reports say passed. Diagnostics are attempted where possible, but inability to aggregate never means success.
- Reports and attachments remain attributable and come from the allowed run/trust boundary. Do not execute untrusted report payloads with elevated authority.
- Native build/typecheck/lint/external/platform obligations retain explicit owners. Avoid duplicated work only when it proves the same immutable artifact and environment contract.

#### Measurable outcomes

Require zero missing/overlapping/foreign test identities and zero false-green results across a declared adversarial aggregation suite. Test at least the missing-report, missing-case, duplicate-shard, wrong-subject/configuration, failed-case and failed/cancelled/skipped-required-job conditions. Compare the selected sharded execution with an equivalent unsharded expected inventory and outcomes.

Approve a target latency budget and runner-cost/resource counter-budget before rollout. Include setup, queues as declared, repeated dependency work, reports and merge in the measured critical path; record total runner allocation separately. Select N and worker limits from observed benefit. N=1 is valid when fan-out is unnecessary or uneconomic; no universal shard count or improvement percentage is required.

#### Adoption evidence

Record intent, provider/local mapping, proof-set identity, planned partition algorithm, selected N/worker limits, baseline/candidate measurements and units, samples/spread, approved budgets, adversarial fixture results, owner, enforcement stage and revisit trigger in target-native receipts. Governance adoption and enabled sharding are not achieved-outcome claims.

#### Failure and exceptions

Stop promotion on incomplete proof or a reproducible budget breach. Reducing N or returning to a supported unsharded equivalent is allowed without dropping obligations. An exception must specify approval, exact scope, expiry/revisit and replacement proof; it cannot label an incomplete mandatory set complete. Preserve protected-check and release-consumer contracts during cutover.

#### Revisit

Rebenchmark after test distribution, runner capacity, billing model, artifact topology or report format changes. Requalify fault cases when CI conditions, required checks or partial-rerun rules change.

#### Consequences

Explicit partition identity and completeness protect the required verdict from partial or mismatched reports. Aggregation needs inventory metadata and adversarial fixtures, and its overhead may favor an unsharded equivalent over additional parallel jobs.

### Guide

This Guide is non-normative; the Long controls.

Vitest V4 shards test files. Split dominant monoliths by independently meaningful contracts, not arbitrary line counts. Compare 1/2/4 where useful and budget the workers of every local shard. Use the native blob reporter and merge command; supplement it only with the smallest tested identity/inventory adapter.

Use separate incoming `blobs/`, metadata and merged-output directories. Artifact names should identify run attempt, lane and shard. A directory with four files is insufficient: check expected identities and predecessor results before reporting success. If per-test attachments matter, upload/download them separately from blobs.

In GitHub Actions, continue collecting independent shard diagnostics after a failure where possible, keep aggregation from reporting green after cancellation, and preserve the required check consumed by merge/release policy. Explicitly test bad or missing artifacts; do not infer safety from `if: always()` or successful JSON parsing.

For a small repository, record N=1 and the trigger to reconsider. For a large repository, record critical-path gain together with runner seconds, memory and variance. Do not discard a required OS lane to improve those numbers.

#### Related decisions

Use AC-ADR-018 for owning-boundary proof, AC-ADR-025 for performance budgets and AC-ADR-049 for evidence reuse alongside the target's delivery and release decisions.

#### Sources

Current references: [V4 sharding](https://v4.vitest.dev/guide/improving-performance), [V4 reporters](https://v4.vitest.dev/guide/reporters), [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

## AC-ADR-062 — Cache test transforms without reusing correctness

Stem: `ac-adr-062-cache-test-transforms-without-reusing-correctness`

### Shared metadata

```text
ID: AC-ADR-062
Title: Cache test transforms without reusing correctness
Status: Accepted
Date: 2026-09-14
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, transform-cache, invalidation, trust-boundaries, performance
Applies when: Persisting or restoring transformed test modules to reduce repeated validation work.
Adoptable: true
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Reuse transformation work only when inputs and trust match, while executing and proving validation independently.
```

### Short

#### Decision summary

Use transform caches only as disposable performance artifacts. Test-result evidence, dependency caches and generated build artifacts retain separate identities and owners. Complete transform inputs and trust boundaries must govern reuse, including local plugin dependencies not represented by a remote key.

Execute selected tests regardless of cache hits; require enabled/disabled/cleared and mutation parity, safe bounded recovery and zero false-green failures. Persist remotely only when measured end-to-end savings justify overhead within cost/security budgets. Record intent, inputs, targets, evidence, ownership and revisit conditions locally. Disable unsafe or unhelpful caching without weakening validation; unknown invalidation is not correctness proof.

### Long

#### Context

Repeated transformation can contribute to test feedback time, but cached code may become stale when plugins depend on inputs outside the tracked file content or configuration. Shared persistence adds transfer costs and provenance concerns that a cache-hit percentage cannot resolve.

#### Intent

Reduce repeated transformation cost while ensuring a cache miss, deletion or invalidation never weakens validation. Cached code must not become stale execution, a substitute for fresh test results or a path across a security boundary.

#### Decision

A target MAY use a supported transform cache only as an independently disposable accelerator. It SHALL classify transform, dependency, build-artifact and test-result evidence separately, with explicit ownership and invalidation. All selected tests still execute; reuse of a prior validation receipt follows the separate applicable evidence policy, never a transform hit.

Reuse identity SHALL cover every input capable of changing transformation, including source/module identity, runtime/framework/plugin versions, configuration, relevant environment or generated inputs and execution/coverage modes where applicable. External persistence keys alone cannot compensate for incomplete local plugin identity. Supply complete input keys, selectively opt out, clear the affected cache or disable caching when correctness cannot otherwise be established.

#### Invariants

- Same-subject cache-enabled, disabled, cold and warm runs preserve test inventory and semantic outcomes. Deliberately changed inputs must produce the corresponding fresh result.
- Restored transformed code does not cross an unapproved trust boundary; PR-writable caches cannot feed privileged release execution. No secrets or authenticated user state enter shared caches.
- Concurrent users of a cache have supported synchronization or separate namespaces; one cleanup cannot delete another execution's cache or source.
- Caches/reports are excluded from source, release and clean-copy input inventories as required by those owning contracts.
- Missing or corrupt disposable state has an explicit safe recovery path. Recovery is bounded and visible; real source failures or repeated cache faults remain failures.
- An experimental feature is not a permanent architectural dependency. Native cache-disable/clear capability remains available.

#### Measurable outcomes

Require zero inventory/outcome mismatches in the declared enabled/disabled/cleared parity set and zero stale passes in mutation fixtures covering relevant plugin/configuration/generated/environment inputs. Negative tests prove unsafe cache provenance is rejected or bypassed before consumption. These are bounded evidence claims, not an assertion that all possible inputs have been exhaustively tested.

Measure total repeated-run savings with restore, validation, write/save and storage overhead included. The target approves the workload, warm/cold mix, latency target and cost/storage ceiling. If persistence has no qualifying net benefit, leave it off or local-only and record the revisit trigger rather than claim success from a cache-hit percentage.

#### Adoption evidence

Keep provider/local identity, intended benefit, scope, transform-input inventory, cache/trust namespace, baseline/candidate subject and versions, sample method, units, approved budgets, actual parity/fault results, owner, enforcement stage and review date/trigger in the target's existing receipt convention. Unmeasured economics and unknown input coverage are explicitly unresolved, not passed.

#### Failure and exceptions

Disable or invalidate unsafe caching and rerun the affected proof without it. A single bounded retry after safe cache discard may diagnose corruption, but its occurrence remains visible. Do not retry indefinitely, weaken assertions or accept stale output. Exceptions identify scope, owner, authority and expiry/revisit; they cannot convert a cache hit into correctness evidence.

#### Revisit

Requalify on changed transforms, plugin inputs, framework/runtime versions, coverage mode, trust model or remote cache semantics. Rebenchmark when transfer/storage overhead or the test workload changes.

#### Consequences

Disposable, input-bound caches can reduce repeated transformation while preserving fresh validation. Maintaining input identity, trust boundaries and parity fixtures adds work; workloads without qualifying net savings can retain local-only caching or disable it.

### Guide

This Guide is non-normative; the Long controls.

The requested V4 profile uses `experimental.fsModuleCache` and `experimental.fsModuleCachePath`. Current V4 documentation describes incomplete default identity for some plugin inputs; use its cache-key extension or opt out when needed. Keep current APIs in this Guide, not the durable decision. Browser execution does not gain this cache automatically.

Use a project/runtime/config namespace and separate shard paths where appropriate. Add a cache-off switch and clear command. Remote keys should permit safe compatible reuse while including relevant input identities; immutable-cache services may need a content-relevant save suffix rather than repeatedly attempting to overwrite one key. Preserve the target package manager's dependency-cache policy separately.

Qualification examples: warm the cache, change a plugin-read JSON file, and verify the changed result; compare with caching disabled; remove the cache; supply a corrupt entry; attempt a cross-trust restore; test cleanup confined to the owned directory. Store raw timing samples and faults. A fresh passing test run remains necessary after every cache recovery.

#### Related decisions

Use AC-ADR-025 for cache/performance budgets and AC-ADR-049 to distinguish transform reuse from reusable validation evidence.

#### Sources

Current references: [V4 experimental cache](https://v4.vitest.dev/config/experimental), [GitHub cache semantics and access](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).
