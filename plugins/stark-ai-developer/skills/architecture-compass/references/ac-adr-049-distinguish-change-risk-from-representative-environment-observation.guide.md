# AC-ADR-049: Distinguish Change Risk From Representative Environment Observation

ID: AC-ADR-049
Title: Distinguish Change Risk From Representative Environment Observation
Status: Accepted
Date: 2026-07-29
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, validation-cadence, evidence-reuse, risk-classification, environment-evidence
Applies when: Implementing, refactoring, delegating, resuming, or validating a bounded change.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-047
Superseded by: none
Guide verified: 2026-07-29
Gist: Classify risk by changed contracts while treating representative environments as proof locations rather than automatic risk triggers.

Variants: [Short](ac-adr-049-distinguish-change-risk-from-representative-environment-observation.short.md) · [Long, canonical](ac-adr-049-distinguish-change-risk-from-representative-environment-observation.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls.

## Risk and observation worksheet

Classify the changed scope before selecting an observation environment.

| Question             | Low-risk requirement                                                          | Escalation signal                                                                                   |
| -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Changed behavior     | Non-behavioral or established localized adjustment                            | New, materially changed, emergent, or broadly coupled behavior                                      |
| Acceptance           | Deterministic and clearly observable                                          | Ambiguous acceptance or costly diagnosis                                                            |
| Reversibility        | Small, bounded reversal                                                       | Destructive, data-bearing, or difficult recovery                                                    |
| Coupling             | Exactly one owning boundary                                                   | Several runtime, package, or integration boundaries                                                 |
| Changed contract     | No external-runtime, infrastructure, public, trust, or data contract change   | Any such contract changes                                                                           |
| Observation location | Any authorized representative location may prove the otherwise low adjustment | The observation would mutate scope, test an ineligible boundary change, or replace a mandatory gate |

An established localized behavior adjustment may be `low` when every low condition holds. It becomes at least `moderate` when it misses a low condition, and `high` or `critical` when a corresponding trigger applies. Needing browser, Preview, CDN, hosted-runtime, or production observation does not by itself determine risk; changing one of those boundaries does.

Suggested cadence: use `final-batch` for a low cohesive slice, `checkpointed` when uncertainty or another escalation signal justifies earlier owning-boundary proof, `reproduce-first` for an observed bug or diagnostically necessary baseline, and `reuse` only after complete receipt reconciliation.

## Validation strategy template

```text
Risk: low | moderate | high | critical
Changed contracts and blast radius:
Proof obligations: <distinct contracts>
Cadence: reuse | final-batch | checkpointed | reproduce-first
Check owners: <one owner per obligation>
Final aggregate gate: <command or scenario>
Environment path: none | Preview | bounded low-risk production observation
```

## Validation receipt template

```text
Proof obligation / check ID:
Subject / owning boundary:
Revision / artifact / content fingerprint:
Command / scenario:
Harness / config / fixtures / lockfile / toolchain:
Evidence stage: source/static | local | CI | publication/install | deployed/production | external/third-party
Environment:
Receipt status: verified | failed | not run | unavailable | stale
Observation / result:
Observed at / freshness boundary:
Owner / source / run link:
Covered contracts:
Limitations / invalidators:
Repository-native location:
```

Use evidence stage `deployed/production` with Environment `Preview` for a deployed Preview observation; the Environment field distinguishes it from Environment `Production`. Do not invent a seventh evidence-stage value.

## Reuse check

1. Match the obligation and owning subject.
2. Match revision, artifact, or relevant content fingerprint.
3. Match the command or scenario.
4. Match harness, fixtures, configuration, lockfile, and toolchain.
5. Match evidence stage and environment.
6. Match the status, observation or result, and freshness boundary.
7. Re-read the governing ADR and observable contract.
8. Check for a newer contradictory failure.
9. Reuse only if no relevant invalidator remains.

## Check-owner ledger

| Proof obligation | Subject | Cadence | Owner | Receipt | Invalidator | Final-gate relationship |
| ---------------- | ------- | ------- | ----- | ------- | ----------- | ----------------------- |
|                  |         |         |       |         |             |                         |

Ask sub-agents to return the receipt fields and limitations rather than independently running the same baseline or aggregate suite.

## Edge-case disposition

| Disposition         | Use when                                             | Minimum record                         |
| ------------------- | ---------------------------------------------------- | -------------------------------------- |
| `fix-and-prove-now` | The current contract is violated                     | Fix and current proof                  |
| `verify-now`        | Impact is uncertain and affects the current decision | Focused diagnostic result              |
| `defer-recorded`    | Not required now and safe to postpone                | Impact, owner, reopen trigger          |
| `accept-risk`       | An authorized owner accepts a bounded residual risk  | Authority, rationale, expiry if useful |
| `not-applicable`    | Evidence shows the case cannot occur in scope        | Supporting evidence                    |

## UI examples

- Established responsive class adjustment with static acceptance: inspect the source and run the owning final gate; do not force a browser session.
- Established localized presentation adjustment whose exact approved artifact needs a representative rendering check: risk may remain low when no browser, hosted-runtime, public, trust, data, or infrastructure contract changes.
- New breakpoint, overflow interaction, focus flow, hydration boundary, or visual acceptance criterion: classify from the changed contract and use representative browser evidence.
- One-time visual acceptance: record the observation without automatically creating a permanent Playwright test.
- Persistent screenshot comparison: pin browser and operating-system conditions and keep the snapshot tied to an intentional contract.

## Preview representativeness checklist

- Risk was classified from the changed contract before the environment was selected.
- The Preview runs the exact candidate artifact.
- The affected domain, CDN, headers, runtime, integrations, and data conditions are represented.
- Known Preview/production differences are recorded.
- The observation proves the intended contract rather than only health or page availability.
- Evidence stage and Environment are recorded separately.
- Limitations and freshness appear in the receipt.

If any relevant condition is absent, record Preview as non-representative for that obligation. Do not silently promote it to production proof.

## Production observation checklist

- The changed scope does not affect an external-runtime, infrastructure, public, trust, or data contract.
- The adjustment is otherwise low, established, localized, deterministic, and reversible.
- All mandatory earlier gates passed; none is being replaced.
- Preview is unavailable or the exact representativeness gap is documented.
- Promotion and target are already authorized.
- The exact approved artifact is already present in the existing environment.
- The observation is read-only or strictly idempotent and uses safe data.
- Blast radius, observations, stop threshold, and rollback are explicit.
- The first threshold breach stops the observation.
- No runtime, infrastructure, public, trust, or data change is being tested.
- No new permanent smoke harness is being created solely for this one-time question.

## Final-batch recovery

1. Freeze the cohesive candidate and run the aggregate once.
2. On failure, locate the smallest owning or reproducing check.
3. Fix and repeat only that check until stable.
4. Freeze a new candidate.
5. Run the aggregate once more.

## Sources

- [ISTQB Certified Tester Foundation Level syllabus](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf), verified 2026-07-28.
- [Google Testing Blog: Code Coverage Best Practices](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html), verified 2026-07-28.
- [Bazel remote caching](https://bazel.build/remote/caching), verified 2026-07-28.
- [DORA: Working in small batches](https://dora.dev/capabilities/working-in-small-batches/), verified 2026-07-28.
- [Playwright best practices](https://playwright.dev/docs/best-practices), verified 2026-07-28.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots), verified 2026-07-28.
- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/), verified 2026-07-28.

## Revisit

Create a successor if the risk vocabulary, receipt identity, Preview-first order, production eligibility, or quality floors change materially. Put tool- or host-specific mechanics in this Guide and refresh their verification date without rewriting the accepted decision.
