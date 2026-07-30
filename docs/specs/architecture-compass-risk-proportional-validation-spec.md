---
title: "Architecture Compass risk-proportional validation"
slug: "architecture-compass-risk-proportional-validation"
artifact_path: "docs/specs/architecture-compass-risk-proportional-validation-spec.md"
mode: "deep"
status: "approved"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-28"
updated: "2026-07-29"
source_request: "Reduce redundant agent and sub-agent validation while preserving risk-based quality floors, preview-first environment proof, and safe production fallback."
phases: ["policy", "skill-routing", "evidence-contract", "validation-release"]
---

# Architecture Compass risk-proportional validation

## Goal

Make Architecture Compass optimize validation effort without lowering product quality. Agents should implement coherent reversible slices before batching distinct required checks, reuse exact and uninvalidated evidence across agents and sessions, and reserve early checkpoints and persistent tests for risks or contracts that justify them.

For behavior that requires representative-environment observation, required local and pre-deployment gates come first and an exact-artifact Preview is preferred next. Only an already-authorized adjustment that remains low risk under contract-based classification may use bounded production observation of the exact already-authorized artifact when Preview is unavailable or not representative. Complex permanent one-off smoke harnesses are not created merely to imitate that environment check.

## Background

- Coding agents can spend more time establishing broad baselines and speculative smoke coverage than implementing a small reversible change.
- Repeating the same baseline or aggregate gate across a lead and several sub-agents adds cost without adding an independent proof obligation.
- Waiting until the end of a coupled or risky change can make failures expensive to localize, so final-only validation cannot be universal.
- Historical evidence is useful only while its subject, inputs, environment, and governing contracts still match.
- Coverage percentages and hypothetical edge cases are signals, not sufficient reasons for permanent test complexity.
- Preview and production prove environment-specific behavior, but neither grants deployment authority nor replaces mandatory earlier gates.

## Scope

### In scope

- One active adoptable target-repository successor for validation cadence, contract-based risk, evidence reuse, check ownership, edge-case disposition, browser/visual proof, Preview, and bounded production observation.
- Integration of the policy into the consolidated Architecture Compass runtime workflow without adding a public action, profile, or Apply variant.
- Repository-native validation receipts and a confirmed evidence-ledger location.
- Derived setup, agent-instruction, refactor-report, catalog, validation, eval, and install-smoke surfaces.
- Current unreleased Architecture Compass `0.6.0` and repository `0.15.0` metadata coherence without publishing.

### Non-goals

- Weakening accepted ADRs, repository-required gates, security, privacy, authorization, data, migration, accessibility, compatibility, release, or rollback proof.
- Defining a universal coverage percentage or treating Pareto as a numeric acceptance threshold.
- Making `fast`, `balanced`, or `strict` a public skill option.
- Treating every later evidence stage as a duplicate of an earlier one.
- Creating a universal ledger filename when the target repository already has a suitable Spec, status, or evidence path.
- Authorizing deployment, traffic changes, production mutation, publication, staging, commits, pushes, or releases.

## Requirements

### Functional requirements

- WHEN a bounded change is planned, THE AGENT SHALL identify required proof obligations, the highest applicable risk, validation cadence, check owner, evidence stage, and final aggregate gate.
- WHEN a current receipt matches the proof obligation, subject or artifact, relevant inputs, command or scenario, harness, configuration, toolchain, stage, environment, status/result, and governing contract, THE AGENT SHALL reuse it instead of rerunning the check.
- WHEN any relevant input or contract changes or newer evidence conflicts, THE AGENT SHALL invalidate only the affected receipt and rerun the smallest owning-boundary check.
- WHEN a change is low-risk, reversible, established, and easy to localize, THE AGENT SHALL default to one final batch after the cohesive slice freezes.
- WHEN a change is uncertain, coupled, expensive to diagnose, public-contract-affecting, difficult to reverse, or crosses a critical boundary, THE AGENT SHALL add focused checkpoints at the risky transitions.
- WHEN a bug is reported or the baseline is diagnostically unclear, THE AGENT SHALL use a focused reproduce-first check.
- WHEN proposing a persistent test, THE AGENT SHALL connect it to a changed observable contract, reproduced defect, critical journey, trust/data/migration/compatibility boundary, demonstrated recurring regression, or mandatory gate.
- WHEN several agents participate, THE LEAD SHALL assign every logical check to exactly one owner and reconcile delegated receipts against the integrated state.
- WHEN an edge case is found, THE AGENT SHALL choose exactly one documented disposition and SHALL NOT silently defer critical safety, contract, data, authorization, or accessibility obligations.
- WHEN environment-specific evidence remains necessary, THE AGENT SHALL complete mandatory earlier gates, then prefer an exact-artifact representative Preview.
- WHEN Preview is absent or not representative, THE AGENT MAY consider production observation only for an exact already-authorized artifact whose changed contract remains low risk, after mandatory gates, with bounded scope, safe data, observability, stop threshold, and rollback.
- WHEN changed scope affects an external-runtime, infrastructure, public, trust, or data contract, THE AGENT SHALL NOT classify it as low or use production fallback to test it.
- WHEN the risk is moderate, high, or critical, THE AGENT SHALL NOT use production as the first substitute for missing pre-deployment evidence.
- WHEN a final aggregate gate fails, THE AGENT SHALL diagnose and repeat the smallest failing check, freeze a new candidate, then rerun the aggregate once.

### Non-functional requirements

- Keep canonical policy in Long ADRs; Short is a faithful abstraction and Guide is non-normative.
- Keep `SKILL.md` compact and route to the policy rather than duplicating it.
- Keep deterministic validation offline where possible and avoid a new live cross-host benchmark for this policy change.
- Preserve staged, unstaged, untracked, ignored, external, and evidence-stage boundaries honestly.
- Keep public artifacts free of secrets, customer data, private repository paths, internal hostnames, and private comparison provenance.

## Design

### Decision topology

- AC-ADR-042 introduced the policy, AC-ADR-047 made low/moderate classification disjoint, and AC-ADR-049 carries the complete policy forward while separating changed-contract risk from observation environment. AC-ADR-049 is the current `Scope: target-repository`, `Adoptable: true` decision and complements AC-ADR-018: AC-ADR-018 owns what and where to prove; AC-ADR-049 owns when, how often, by whom, and under which reuse conditions.
- The accepted runtime chain AC-ADR-002 → AC-ADR-026 → AC-ADR-043 → AC-ADR-045 → AC-ADR-048 preserves the five-workflow history. The current setup and Guide surfaces resolve the locked AC-ADR-047 foundation reference through AC-ADR-049 for new or evidence-empty repositories.
- Accepted predecessors remain immutable historical triplets with reciprocal supersession metadata; they are not removed or rewritten in place.
- Independent AC-ADR-046 ranks architecture evidence without adding operational authority. It complements, but does not supersede, the validation decision.

### Cadence and risk

The internal cadence vocabulary is `reuse`, `final-batch`, `checkpointed`, and `reproduce-first`. Risk is `low`, `moderate`, `high`, or `critical`; the highest trigger wins and uncertainty or weak reversibility escalates the class. These values are internal planning fields, not public user-selectable modes.

The classes are disjoint. `low` is limited to non-behavioral or established localized work with deterministic acceptance, one owning boundary, easy reversal and diagnosis, and no changed external-runtime, public, trust, data, infrastructure, high, or critical contract. `moderate` is a reversible behavioral change within one owning boundary that does not satisfy `low` and has no `high` or `critical` trigger. Cross-boundary, externally visible, sensitive, migration, infrastructure-changing, hard-to-reverse, or weakly understood work escalates under canonical AC-ADR-049. Needing representative observation does not by itself change risk; changing the observed boundary does.

### Receipt identity

A reusable receipt records proof obligation, subject/owning boundary, revision/artifact/content fingerprint, command or scenario, harness/config/fixtures/lockfile/toolchain identity, exactly one AC-ADR-004 evidence stage, separate environment, explicit status, observation/result/time/freshness, owner/source/run link, covered contracts, limitations, invalidators, and repository-native location.

Deterministic evidence for an immutable subject has no arbitrary time-to-live. Volatile Preview, deployed, runtime, or external evidence follows repository-defined freshness; without one it remains historical rather than current proof.

### Evidence ladder

1. Required source/static, local, build, CI, security, migration, and other pre-deployment gates.
2. Existing Preview using the exact candidate artifact, only if it represents the affected infrastructure, domain, CDN, header, runtime, integration, or data condition.
3. When Preview is unavailable or not representative, separately authorized bounded production observation of the exact already-authorized artifact only for work that remains low risk because it changes no external-runtime, infrastructure, public, trust, or data contract.

Preview and production remain environments within the existing staged-evidence model; no new public action or deployment authority is introduced.

## Architectural decisions

- ADR required: yes.
- Current decision: AC-ADR-049, reciprocal successor to AC-ADR-047; AC-ADR-047 reciprocally supersedes AC-ADR-042.
- Existing decisions consulted: AC-ADR-003, AC-ADR-004, AC-ADR-018, AC-ADR-022, AC-ADR-024, AC-ADR-048, AC-ADR-046, ADR-0032, ADR-0033, and ADR-0038.
- Supersession: AC-ADR-049 carries forward the complete AC-ADR-047 policy and corrects only change-risk versus observation-environment classification.
- Accepted-history disposition: AC-ADR-026, AC-ADR-043, AC-ADR-042, and AC-ADR-047 remain immutable superseded triplets with reciprocal metadata.
- ADR gate result: approved by the maintainer on 2026-07-28.

## Source challenge

- Repository evidence checked: Architecture Compass ADR catalog and triplets, five-workflow runtime contract, derived assets, deterministic validator, install smoke, eval inventory, repository ADR policy, validation docs, release metadata, and current Git state.
- External guidance checked: risk-based testing, coverage interpretation, small batches, exact-input cache reuse, browser testing, visual snapshots, release canaries, and reliability testing.
- Requirements revised: Preview is the preferred environment proof; production is only a guarded low-risk fallback. A permanent smoke test is justified by a recurring contract, not by a one-time environment question.
- Requirements preserved: mandatory gates, owning-boundary proof, reversible slices, explicit production authority, evidence-stage honesty, and focused diagnosis after a final-gate failure.
- Skipped proof: hosted CI, public installation, Preview, deployment, production, and third-party runtime evidence are not authorized by this implementation.

## User verification

- Final checkpoint confirmed by: repository maintainer.
- Confirmation date: 2026-07-28.
- Public persistence approved: yes.
- Preview-first correction confirmed: yes.
- Scope and non-goals confirmed: yes.
- Open decisions: none.

## Implementation plan

1. Preserve and lock AC-ADR-042 and AC-ADR-047 as superseded history; add and lock reciprocal successor AC-ADR-049.
2. Route AC-ADR-049 through AC-ADR-048 workflow guidance, catalog, skill dispatcher, setup inventory, repository-native evidence pointer, refactor report, and new-repository plan.
3. Add two focused eval cases and extend existing sub-agent reconciliation and refactor-checkpoint cases.
4. Update deterministic inventory/count assertions, orphan fixture, validation docs, install smoke, and the current unreleased changelog.
5. Remove the invalid colliding unsuffixed repository ADR draft and obsolete patch artifact.
6. Run focused gates while stabilizing and one aggregate/release validation batch after content freeze.

## Validation

```bash
npm run validate:adrs
npm run validate:architecture-compass
npm run validate:skills
npm run validate
npm run format:check
npm run lint
git diff --check
npm run smoke:install
node scripts/validate-release.mjs --version 0.15.0 --base-ref origin/main
```

If the aggregate fails, repeat only the smallest owning gate until a new candidate is stable, then run the aggregate once more.

## Acceptance scenarios

- A localized, non-behavioral public-documentation or copy correction with deterministic acceptance uses `final-batch` without mandatory browser proof.
- A complex rendered or accessibility-sensitive interaction receives representative Browser/Preview evidence.
- A reported defect uses `reproduce-first` and a contract-backed regression test.
- Auth, migration, destructive, or irreversible work receives checkpoints and never uses production as the first missing-environment substitute.
- An exact valid receipt prevents a rerun; relevant subject, lockfile, harness, environment, or contract drift invalidates only the affected proof.
- Two sub-agents share a ledger with one owner per check and no parallel baseline rerun.
- A representative Preview prevents a production fallback for the same obligation.
- Missing Preview permits production observation only when the changed contract remains low risk, every mandatory earlier gate passed, the exact already-authorized artifact is present, and every authorization, observability, stop, data-safety, and rollback condition is satisfied.

## Rollout and rollback

- Rollout is a single coherent public-skill working-tree change; no partial ADR/catalog state may be published.
- No deployment, Preview, production observation, tag, publication, commit, staging, or push is part of this implementation.
- Before publication, rollback is a normal reviewed revert of the complete uncommitted/PR slice without destructive Git operations.
- After publication, correction uses a forward patch release; accepted ADR history is changed only through a reciprocal successor.

## Risks

| Risk                                     | Mitigation                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Late failures are harder to localize     | Escalate coupled or uncertain boundaries to `checkpointed`; diagnose with the smallest failing check.       |
| Stale evidence suppresses a needed rerun | Bind receipts to subject, inputs, stage, environment, contracts, and explicit invalidators.                 |
| Efficiency language weakens quality      | Keep accepted ADRs, mandatory gates, critical boundaries, and changed-contract evidence as hard floors.     |
| Production becomes a debugging shortcut  | Require Preview first, low risk, separate authorization, bounded observation, stop threshold, and rollback. |
| Ledger maintenance becomes overhead      | Persist only expensive or reusable receipts in an existing repository-native location.                      |

## Done when

- [ ] AC-ADR-042 → AC-ADR-047 → AC-ADR-049 is reciprocal, cataloged, locked, and preserves immutable Decision text.
- [ ] The accepted workflow chain remains reciprocal through AC-ADR-048 and resolves the historical AC-ADR-047 foundation reference through AC-ADR-049.
- [ ] The new/evidence-empty foundation contains exactly seven current candidates including AC-ADR-049.
- [ ] Agent, setup, refactor, and new-repository templates expose the repository-native receipt contract without inventing a universal path.
- [ ] Preview-first and the low-risk production fallback are covered by deterministic evals.
- [ ] No accepted quality floor or public mode inventory is weakened or expanded.
- [ ] Architecture Compass validation reports 49 complete triplets and the install smoke reports 147 variants.
- [ ] Declared local gates pass or their exact boundary and blocker are reported.

## Assumptions

- The current unpublished Architecture Compass `0.6.0` work remains part of the same coherent unreleased catalog change.
- Existing staged Git state remains untouched; new work is reported as working-tree and untracked state.
- Existing Preview, CI, deployment, and production systems are evidence targets only when separately authorized by the target repository and user.
