# AC-ADR-042: Calibrate Validation to Change Risk and Reuse Fresh Evidence

ID: AC-ADR-042
Title: Calibrate Validation to Change Risk and Reuse Fresh Evidence
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, validation-cadence, evidence-reuse, test-ownership
Applies when: Implementing, refactoring, delegating, resuming, or validating a bounded change.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: AC-ADR-047
Guide verified: 2026-07-29
Gist: Calibrate validation timing to change risk, reuse uninvalidated evidence, and assign each proof obligation once.

Variants: [Short](ac-adr-042-calibrate-validation-to-change-risk-and-reuse-fresh-evidence.short.md) · [Long, canonical](ac-adr-042-calibrate-validation-to-change-risk-and-reuse-fresh-evidence.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls this historical record. Use AC-ADR-049 for the active contract-based risk classification, representative-observation boundary, and current mechanics.

## Risk and cadence worksheet

| Question      | Low-risk requirement                              | Escalation signal                                     |
| ------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Behavior      | Non-behavioral or established localized behavior  | New or materially changed behavior                    |
| Acceptance    | Deterministic and locally observable              | Ambiguous, emergent, or environment-dependent         |
| Reversibility | Small local revert                                | Destructive, data-bearing, or difficult recovery      |
| Coupling      | Exactly one owning boundary                       | Several runtime, package, or integration boundaries   |
| Diagnosis     | Failure is local and obvious                      | Failure appears only after integration or promotion   |
| Contract      | No public, trust, data, or infrastructure trigger | Public, trust, data, migration, or critical journey   |
| Environment   | No external-runtime dependency                    | Browser, CDN, headers, hosted runtime, or third party |

Suggested cadence: classify as `low` and use `final-batch` only when every low-risk requirement holds. A reversible behavioral change in one owning boundary is at least `moderate`; use `checkpointed` when uncertainty or another escalation signal justifies an earlier owning-boundary proof. Use `reproduce-first` for an observed bug or diagnostically necessary baseline and `reuse` only after receipt reconciliation.

## Validation strategy template

```text
Risk: low | moderate | high | critical
Proof obligations: <distinct contracts>
Cadence: reuse | final-batch | checkpointed | reproduce-first
Check owners: <one owner per obligation>
Final aggregate gate: <command or scenario>
Environment path: none | Preview | low-risk production fallback
```

## Validation receipt template

```text
Proof obligation / check ID:
Subject / owning boundary:
Revision / artifact / content fingerprint:
Command / scenario:
Harness / config / fixtures / lockfile / toolchain:
Evidence stage / environment:
Result / observed at / freshness boundary:
Owner / source / run link:
Covered contracts:
Limitations / invalidators:
Repository-native location:
```

## Reuse check

1. Match the obligation and owning subject.
2. Match revision, artifact, or relevant content fingerprint.
3. Match harness, fixtures, configuration, lockfile, and toolchain.
4. Match evidence stage and environment.
5. Re-read the governing ADR and observable contract.
6. Check for a newer contradictory failure.
7. Reuse only if no relevant invalidator remains.

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
- New breakpoint, overflow interaction, focus flow, hydration boundary, or visual acceptance criterion: use representative browser evidence.
- One-time visual acceptance: record the observation without automatically creating a permanent Playwright test.
- Persistent screenshot comparison: pin browser and operating-system conditions and keep the snapshot tied to an intentional contract.

## Preview representativeness checklist

- The Preview runs the exact candidate artifact.
- The affected domain, CDN, headers, runtime, integrations, and data conditions are represented.
- Known Preview/production differences are recorded.
- The observation proves the intended contract rather than only health or page availability.
- Limitations and freshness appear in the receipt.

If any relevant condition is absent, record Preview as non-representative for that obligation. Do not silently promote it to production proof.

## Production fallback checklist

- All mandatory earlier gates passed.
- Preview is unavailable or the exact representativeness gap is documented.
- Risk is still low and the change is reversible.
- Promotion and target are already authorized.
- The exact approved artifact is used.
- The probe is read-only or strictly idempotent and uses safe data.
- Blast radius, observations, stop threshold, and rollback are explicit.
- The first threshold breach stops the probe.
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
