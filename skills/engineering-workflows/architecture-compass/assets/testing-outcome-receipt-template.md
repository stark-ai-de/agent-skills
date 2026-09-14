# Testing outcome receipt

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this template conflicts or drifts.

Use only the fields applicable to the adopted decisions ([AC-ADR-059](../references/ac-adr-059-own-repository-validation-through-discoverable-framework-tests.long.md), [AC-ADR-060](../references/ac-adr-060-isolate-test-execution-by-effects-and-runtime-contracts.long.md), [AC-ADR-061](../references/ac-adr-061-shard-tests-as-complete-fail-closed-evidence-sets.long.md), [AC-ADR-062](../references/ac-adr-062-cache-test-transforms-without-reusing-correctness.long.md)). Keep this record in the target's existing ADR/validation receipt convention. It is an extension of that evidence, not a provider-owned database. A local ADR's adoption status, rollout completion and achieved outcome are separate facts.

## Identity, intent and scope

- Provider ID, version/commit and canonical content digest:
- Local ADR ID, path, status and mapping disposition (`adopt | adapt | defer | reject`):
- Original problem, beneficiaries, intended behavior and prohibited tradeoffs:
- Adaptations and existing equivalent local decision:
- Owning package, language, lane, harness/worker/product runtime and platform:
- In-scope rules, inputs and independent expected file/case inventory digests:
- Exclusions, authority and unowned live validation entrypoints:
- Baseline subject, command, environment, cache state, sample method and raw evidence:
- Candidate subject, configuration/lockfile identity, concurrency, shard plan, run ID/attempt and collection date:
- Enforced I/O/resource boundaries, timeouts, cleanup owner and unobservable restrictions:
- Transform input inventory, cache namespace/trust boundary and disable/clear/recovery path:

## Measurements

| Metric                      | Definition and unit                                                                                                            | Population/denominator | Aggregation and command                                    | Approved target/direction     | Observed value | Measurement state | Raw evidence |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------- | ----------------------------- | -------------- | ----------------- | ------------ |
| Rule mapping coverage       | mapped in-scope rules / all in-scope rules                                                                                     | Frozen inventory       |                                                            | 1 plus reviewed exceptions    |                | unmeasured        |              |
| Negative scenario detection | detected / declared faults                                                                                                     | Declared fault set     |                                                            | 1                             |                | unmeasured        |              |
| Correctness                 | mutations, unauthorized network events, cleanup failures, inventory differences/overlap, false greens, cache parity mismatches | Declared runs/cases    |                                                            | 0 for each applicable counter |                | unmeasured        |              |
| Feedback                    | critical-path seconds; queue inclusion stated                                                                                  | Comparable workload    | Median/range; raw samples                                  | Target-owned                  |                | unmeasured        |              |
| Cost and reliability        | runner seconds, peak memory, flake frequency, cache transfer/storage cost                                                      | Allocations/repeats    | Include setup, installs, reports, merge and cache overhead | Target-owned ceilings         |                | unmeasured        |              |

- Measurement state: `met | unmet | unmeasured | waived | not-applicable`.
- Target approval: owner, value, date before experiment/rollout and scope.
- Baseline and candidate must prove equivalent inventories and runtime/platform obligations. For example, collect five or more comparable initial samples when affordable; this is not a universal numeric gate. Report only supported aggregates. A small sample does not justify a p95 claim.
- A missing baseline or denominator is unknown, not zero or 100 percent. Zero denominators require evidence for `not-applicable`. Missing observation stays `unmeasured`; a breached target or expired waiver is `unmet`. A valid waiver is `waived`, never `met`.
- Budgets include feedback and counter-metrics. No universal shard count or speedup target applies. Report unmeasured CI economics separately from local timing.

## Evidence and enforcement

```text
Evidence stage: source/static | local | CI | publication/install | deployed/production | external/third-party
Environment:
Status: verified | failed | not run | unavailable | stale
Observation / result:
Subject / run / attempt / observed at:
Owner / raw evidence / freshness invalidators:
Enforcement: guidance | report-only | blocking
Rollout state and remaining obligations:
Restoration trigger and next review:
Exception scope / rationale / approver / owner / expiry or observable revisit / replacement evidence:
```

| Stage | Environment | Status  | Observation/result | Subject/run | Evidence/limitations |
| ----- | ----------- | ------- | ------------------ | ----------- | -------------------- |
|       |             | not run |                    |             |                      |

An adoption or configuration change is not achieved performance or compatibility. Incomplete mandatory shard proof cannot be waived into completeness. Cache hits never substitute for executed validation. Keep unknown enforcement, missing baseline, unsupported runtime and external evidence gaps visible.
