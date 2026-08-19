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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: AC-ADR-047
Guide verified: 2026-07-29
Gist: Calibrate validation timing to change risk, reuse uninvalidated evidence, and assign each proof obligation once.

Variants: [Short](ac-adr-042-calibrate-validation-to-change-risk-and-reuse-fresh-evidence.short.md) · **Long, canonical** · [Guide](ac-adr-042-calibrate-validation-to-change-risk-and-reuse-fresh-evidence.guide.md)

## Context

Agents can spend more time establishing broad baselines, adding speculative smoke tests, and repeating aggregate gates than implementing a small reversible change. Running the same proof through a lead and several sub-agents increases cost without increasing coverage of distinct obligations. A permanent test created only for hypothetical completeness can also outlive its value and increase future maintenance.

Testing only at the end is not universally safe. When a change crosses coupled boundaries, alters public or trust contracts, is difficult to reverse, or will be expensive to diagnose later, a focused intermediate check can reduce total recovery cost. Historical, CI, or delegated evidence can avoid work, but only while it remains bound to the exact subject, inputs, environment, and governing contracts.

AC-ADR-018 determines what behavior must be proved and which owning boundary should prove it. This decision complements that contract by determining when and how often required checks run, who owns them, and when prior evidence is reusable. It does not weaken AC-ADR-003 lead reconciliation, AC-ADR-004 evidence-stage honesty, AC-ADR-022 promotion and rollback gates, or the quality floors of security, privacy, accessibility, compatibility, data, and operations decisions.

## Decision

For every bounded delivery slice, calculate the required proof as mandatory repository, user, and accepted-ADR gates plus evidence for changed observable contracts and necessary uncertainty or failure diagnosis, minus valid reusable evidence. Deduplicate the result by logical proof obligation before assigning or running checks.

### Risk and validation cadence

Classify the slice by its highest applicable risk:

- `low`: documentation, copy, a mechanical change, or an established localized implementation that is reversible and easy to diagnose.
- `moderate`: a reversible change contained within one owning boundary without a critical trigger.
- `high`: affects a public contract, crosses several boundaries, or introduces material framework, I/O, concurrency, infrastructure, availability, third-party, or critical UI-flow behavior.
- `critical`: affects security, privacy, authentication or authorization, tenant isolation, payments, data integrity or loss, migrations, credentials, sensitive production writes, destructive or irreversible behavior, or a large blast radius without a proved recovery path.

Uncertainty, weak observability, poor reversibility, or high later diagnosis cost raises the classification. When classifications conflict, use the higher one.

Assign one internal cadence to each proof obligation:

- `reuse`: a reconciled, uninvalidated receipt already proves the unchanged obligation.
- `final-batch`: implement a cohesive slice, freeze the candidate, and run each distinct required check once. This is the default for low-risk work.
- `checkpointed`: run a focused check at an uncertain, coupled, costly-to-diagnose, difficult-to-reverse, public-contract, trust, data, or irreversible boundary, then retain the final candidate gate.
- `reproduce-first`: before changing code, reproduce a reported defect or characterize a baseline whose uncertainty is necessary for diagnosis.

These values are internal validation-planning fields. They are not public `fast`, `balanced`, or `strict` modes and do not require user selection unless the resulting action separately needs authorization.

### Before implementation and persistent tests

A complete baseline run or newly invented smoke test is not the default before implementation. Run an upfront check only for a reported or observed defect, a diagnostically necessary unclear baseline, invalidated evidence at a high or critical boundary, an irreversible step, expensive later localization, or an explicit repository, ADR, or user gate.

Add a persistent test only when it proves at least one of:

- a changed observable contract;
- a reported or reproduced defect;
- a critical user journey;
- a trust, data, migration, compatibility, or public-contract boundary;
- a demonstrated recurring regression whose automation saves repeated effort; or
- a mandatory repository or accepted-ADR gate.

A coverage percentage, implementation detail, hypothetical completeness, or an assertion already proved equivalently is not sufficient by itself. Coverage remains a risk signal rather than a universal numeric target. A new smoke test must prove a recurring integration, installation, runtime, or promotion obligation rather than imitate a one-time observation.

### Check identity, ownership, and deduplication

Every logical proof obligation has exactly one owner: the lead agent, one named sub-agent, CI, a human reviewer, or an authorized runtime probe. Sub-agents read the current ledger, run only assigned checks, and report invalidators. The lead reconciles their results against the integrated candidate and current canonical decisions.

Treat two checks as duplicates only when they share the proof obligation, subject and revision or content/artifact fingerprint, command or scenario, harness, configuration, fixtures, lockfile, toolchain, evidence stage, and environment, with no invalidator. A changed input, a different stage or environment, or a targeted diagnostic rerun is a distinct proof. An aggregate gate may overlap an earlier focused check only when that check provided necessary localization or risk reduction; otherwise the contained check runs only through the aggregate.

### Reusable evidence receipts

Persist an expensive or reusable receipt in a confirmed repository-native Spec, status, or evidence path. The receipt may link to its CI, Preview, production, or review run. Do not create one universal ledger filename. A receipt records:

- proof obligation or check ID;
- subject or owning boundary;
- revision, exact candidate artifact, or relevant dirty-tree/content fingerprint;
- command or scenario;
- harness, configuration, fixtures, lockfile, and toolchain identity;
- evidence stage and environment;
- result, observation time, and applicable freshness boundary;
- owner, source, and run link when available;
- covered contracts;
- limitations and invalidators; and
- repository-native location.

Relevant changes to the subject, transitive dependencies, harness, fixtures, configuration, lockfile, toolchain, runtime, environment, evidence stage, ADR, or observable contract invalidate the affected receipt. A different candidate artifact or contradictory current failure, CI, Preview, or runtime evidence also invalidates it. Deterministic evidence for an immutable subject receives no arbitrary time-to-live. Volatile Preview, deployment, runtime, or external evidence follows repository-defined freshness; without one it remains historical rather than current proof.

### Findings and edge cases

Give every relevant finding exactly one disposition:

- `fix-and-prove-now`;
- `verify-now`;
- `defer-recorded`, with impact, owner, and reopen trigger;
- `accept-risk`, with explicit authority, rationale, and an expiry when applicable; or
- `not-applicable`, with supporting evidence.

Security, privacy, authorization, tenancy, data integrity, data loss, irreversible behavior, public contracts, required compatibility, and blocking accessibility findings cannot be silently deferred or accepted for efficiency.

### UI and browser evidence

Source, type, build, or static evidence may satisfy a simple established responsive or CSS change when the acceptance criterion is statically decidable and no new browser-dependent behavior exists. Use representative browser or visual evidence when acceptance depends on rendered geometry, breakpoints, overflow, dynamic content, hydration, focus, animation, browser APIs, complex interaction, accessibility, a critical journey, or explicit visual approval. A one-time visual acceptance does not automatically justify a permanent Playwright suite. When snapshots are persisted, pin the material browser and operating-system environment.

### Preview-first environment evidence

For environment-dependent behavior, use this order:

1. Complete every mandatory source/static, local, build, CI, security, migration, and other pre-deployment gate.
2. When an existing Preview is available, check the exact candidate artifact there.
3. Count Preview as proof only when it represents the affected infrastructure, domain, CDN, header, runtime, integration, or data condition. Record known differences and limitations in the receipt.
4. If Preview is unavailable or not representative, record the evidence gap before considering production.
5. Consider a production probe only for an already-authorized low-risk reversible change.

Preview and production are separate environments within the existing evidence-stage model. Evidence from one does not imply the other, and neither grants deployment, publication, migration, traffic, or production-mutation authority.

### Bounded production fallback

A production probe is permitted only when every condition holds:

- risk remains `low`;
- the change and probe are reversible;
- mandatory earlier gates passed;
- Preview is unavailable or its relevant non-representativeness is documented;
- promotion and the exact target are already authorized;
- the exact approved artifact is used;
- the probe is read-only or strictly idempotent and uses safe synthetic or otherwise authorized data;
- blast radius is bounded by a canary, cohort, route, tenant-safe boundary, or equivalent control;
- observations, stop threshold, and rollback are defined before the probe; and
- the probe stops at the first threshold breach.

Moderate, high, and critical changes never use production as the first replacement for missing pre-deployment evidence. They require an appropriate safe environment or remain blocked. Production is not a compiler, migration sandbox, or iterative debugging loop and never replaces mandatory security, authorization, migration, contract, accessibility, or recovery tests. Do not build a complex permanent one-off smoke harness solely to imitate an otherwise sufficient one-time representative Preview or authorized low-risk production observation.

### Final gate and failure localization

After the candidate freezes, run the required final aggregate gate once. If it fails, identify the smallest owning or reproducing check, fix and repeat only that check until stable, freeze a new candidate, and rerun the aggregate once. Do not run the complete suite after every diagnostic edit.

## Invariants

- Accepted ADRs, repository instructions, user requirements, and mandatory gates override effort optimization.
- Every changed observable contract receives current post-change evidence at its owning boundary.
- Critical security, privacy, authorization, data, migration, compatibility, accessibility, irreversible, and recovery boundaries retain their required proof.
- A known in-scope failure cannot be reported as completed.
- Reuse never crosses an invalidated subject, input set, stage, environment, or contract.
- Delegated and historical evidence remains provisional until current-state reconciliation.
- Preview precedes any eligible production fallback, and no validation plan creates deployment authority.

## Conflict resolution

An applicable target-repository ADR or mandatory gate may require stronger proof, prohibit Preview or production use, or define stricter freshness. Follow the stronger applicable contract. When evidence conflicts, keep the affected obligation failed or blocked until reconciled. When authorization is missing, record the gap and stop rather than substituting a broader action.

## Failure handling

If a receipt is stale, rerun only its invalidated owning boundary. If a Preview is not representative, do not report it as current proof. If a production stop threshold is reached, stop immediately and apply the authorized recovery path without expanding scope. If final validation fails, use the smallest reproducer before a single new aggregate run.

## Acceptance criteria

- Required checks record risk, cadence, owner, subject, stage, and final-gate relationship.
- No check repeats without a relevant mutation, different stage/environment, invalidation, or diagnostic purpose.
- Reused evidence satisfies the receipt and freshness contract.
- Persistent tests cite a changed contract, defect, critical boundary, recurring regression, or mandatory gate.
- Every edge case has one permitted disposition.
- All mandatory earlier gates precede Preview.
- Preview uses the exact candidate artifact and records representativeness.
- A production probe satisfies every low-risk, authorization, safety, observation, stop, and rollback condition.
- Moderate, high, and critical work never uses production as the first substitute.
- Completion remains blocked while a required gate is missing or failed.

## Consequences

Agents spend less time on redundant baselines, per-microstep aggregate runs, speculative tests, and permanent harnesses for one-time questions. Receipts, risk classification, and check ownership add a small coordination cost. Some low-risk failures may surface later, while explicit checkpoint triggers contain diagnosis risk and Preview-first evidence improves environment fidelity without normalizing production debugging.
