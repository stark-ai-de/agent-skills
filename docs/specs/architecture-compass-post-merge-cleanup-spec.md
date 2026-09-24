# Architecture Compass post-merge cleanup proposal

Status: Proposal; documentation only, not activated
Decision: [ADR-0056](../adrs/0056-assess-cleanup-after-verified-merges.short.md) ([Long, canonical](../adrs/0056-assess-cleanup-after-verified-merges.long.md) · [Guide](../adrs/0056-assess-cleanup-after-verified-merges.guide.md))

## Original idea

Whenever a merge is detected, check whether it has made tests, old code or related artifacts unnecessary. Capture that habit as an Architectural Decision Record, then make it available through Architecture Compass so rerunning the skill can establish or audit the rule in other repositories.

The motivating pattern is a completed service retirement: the original PR removed the service, and a later request uncovered a completed one-time validation fixture and stale test instructions. Other tests still protected deliberately retained adapters and a rerunnable cleanup job. The useful lesson is to perform the assessment consistently, not to assume that every remaining test is obsolete.

## Evaluation and refinements

The idea is useful as a lifecycle trigger because some cleanup becomes justified only after integration or a subsequent transition. The normative proposal is in ADR-0056; this specification explains its intended implementation.

| Initial expectation                            | Refined behavior and reason                                                                                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every detected merge prompts cleanup           | Every verified observed merge prompts an impact-bounded assessment. No useful finding is a valid result.                                                                                  |
| Merged code makes the old path removable       | Current consumers, deployed versions, supported compatibility and rollback conditions determine removal readiness.                                                                        |
| Unreferenced or rarely run tests can go        | Trace the protected contract and actual consumers, including manual, dynamic, shared and external uses. Lack of static references or CI execution is insufficient.                        |
| Avoid carrying unnecessary tests               | Remove only exclusively ended or demonstrably redundant protection; repair a still-useful failing test instead of hiding the failure.                                                     |
| Repeat the check whenever a merge is mentioned | Reuse a valid assessment and existing follow-up for the same merged subject; revisit only affected evidence when material state or a deferred condition changes.                          |
| Compass makes this work in every repository    | A released provider decision must be adopted into each target's local ADR and effective agent instructions. An agent must observe the event; the skill alone is not a background watcher. |
| Produce a cleanup PR                           | Prepare a scoped follow-up when justified and authorized. Do not impose a new file, issue, test or PR when a brief existing-task note suffices.                                           |

Assessment cost is bounded by the change and immediate dependencies. Larger unrelated discoveries are separate work. The objective is less unnecessary maintenance, not a file-count, test-count or runtime-reduction quota.

## Source challenge and ADR gate

Existing accepted decisions already supply much of the removal reasoning:

- [AC-ADR-021](../../skills/engineering-workflows/architecture-compass/references/ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.short.md) ([Long, canonical](../../skills/engineering-workflows/architecture-compass/references/ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.long.md) · [Guide](../../skills/engineering-workflows/architecture-compass/references/ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.guide.md)) already gives temporary migrations an owned exit and requires consumer adoption, reconciliation and rollback independence.
- [AC-ADR-049](../../skills/engineering-workflows/architecture-compass/references/ac-adr-049-distinguish-change-risk-from-representative-environment-observation.short.md) ([Long, canonical](../../skills/engineering-workflows/architecture-compass/references/ac-adr-049-distinguish-change-risk-from-representative-environment-observation.long.md) · [Guide](../../skills/engineering-workflows/architecture-compass/references/ac-adr-049-distinguish-change-risk-from-representative-environment-observation.guide.md)) distinguishes lasting test obligations from one-time observation, deduplicates equivalent proof and governs evidence reuse.
- [AC-ADR-018](../../skills/engineering-workflows/architecture-compass/references/ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.short.md) ([Long, canonical](../../skills/engineering-workflows/architecture-compass/references/ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.long.md) · [Guide](../../skills/engineering-workflows/architecture-compass/references/ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.guide.md)) governs behavioral proof and gradual enforcement.
- [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)) applies owning-boundary validation in this repository.

The missing element is the verified-merge assessment trigger and its closure/revisit lifecycle. The proposal supplements these decisions instead of rewriting accepted history. Cleanup outcomes reuse the target's existing finding and evidence record; they do not require a second status ledger. Under an adopted AC-ADR-049 contract, its finding dispositions, ownership and evidence requirements remain authoritative.

ADR-0056 remains Proposed and unlocked. This PR does not accept the future public rule or change any active instruction, provider catalog, skill, validator, release artifact or consuming repository.

## Future Compass delivery

1. Review and accept or revise the proposal. Recheck intervening provider decisions and assign the public AC-ADR identity at implementation time; no number is reserved here.
2. Author the public Short/Long/Guide triplet in `skills/engineering-workflows/architecture-compass/references/` with `Scope: target-repository` and `Adoptable: true`. Resolve overlaps and lineage explicitly. Do not insert a Proposed record into the current runtime catalog, whose inventory admits accepted or superseded decisions.
3. Update the canonical `references/adr-catalog.md`, applicable concern routing, decision lineage/locks, inventory validation, install inventory and focused evaluation cases. Add only the workflow and instruction guidance needed to apply the accepted decision; no sixth Compass workflow is needed.
4. Generate portable projections through `pnpm run sync:agent-plugin`, validate the affected source/projection contracts, and follow the existing release and install process. A merged proposal or implementation PR does not by itself update installed skills.
5. In each target repository, run the updated Compass `setup`: `recommended` considers the rule when repository evidence shows a merge-based delivery workflow; `complete` evaluates it with every accepted adoptable candidate. Persist repository-native ADR identity, provider mapping and a supported instruction reference after resolving local authority and conflicts. Preserve accepted target history through the existing successor/adaptation process.
6. Rerunning `setup` reconciles an equivalent existing rule rather than creating duplicate ADRs. `audit` checks adoption and available relevant merge assessments, reports missing or ineffective instructions and stale deferrals, and remains strictly read-only. It does not claim compliance when no execution evidence is available.
7. Once locally adopted and loaded, repository agents perform the check when they observe a verified merge during work. Unattended forge-event or scheduled execution would require a separately authorized integration and operating design.

The guarantee is therefore an explicit, auditable agent obligation within observed work, not proof that every unattended merge has been checked.

## Acceptance scenarios for later implementation

| Scenario                                                          | Expected behavior                                                                                                                |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| User reports a merge, forge confirms it                           | Resolve the merged subject and current target state, then assess the relevant scope.                                             |
| PR is approved, queued, or closed without merge                   | Do not claim the merge trigger was verified. Continue independent authorized work while naming unavailable evidence.             |
| Squash/rebase merge or subsequent revert                          | Use authoritative integration mapping and current behavior; do not require original-head ancestry or reuse invalidated findings. |
| Completed one-time migration proof has no remaining contract      | Propose removing the executable fixture while preserving important evidence through a verifiable historical reference.           |
| Adapter is disabled but its source remains supported              | Retain its relevant regression and dependency tests.                                                                             |
| Cleanup job remains rerunnable with deletion rights               | Retain identity, authorization, protected-resource and repeat-execution tests.                                                   |
| Old release or rollback still needs a compatibility path          | Defer removal with owner and a specific rollout/window completion trigger.                                                       |
| Test looks duplicate but protects a different failure mode        | Retain it; prove equivalent obligations before consolidating coverage.                                                           |
| No static references, but manual/exported/dynamic use is possible | Inspect that use or leave the candidate unresolved; do not infer safe deletion.                                                  |
| Same merge is reported again; follow-up already exists            | Reuse the relevant assessment and follow-up without duplicate comments or PRs.                                                   |
| Small documentation merge has no candidates                       | Finish with a concise no-finding statement in the existing task output.                                                          |
| Cleanup follow-up itself is merged                                | Apply the same bounded assessment; stop with no further artifact when nothing remains.                                           |
| Compass setup is rerun in an adopting repository                  | Reconcile provider/local identity and effective instructions without rewriting accepted history.                                 |
| Compass audit finds no local rule or no execution evidence        | Report the specific gap without writing or claiming automatic enforcement.                                                       |

## Validation and completion boundaries

For this documentation-only proposal, validate the local ADR triplet, grouped index, links, Proposed status, unchanged accepted decision locks and unchanged runtime/projection paths. Run the repository ADR validator and formatting checks on the changed files. Hosted PR validation remains required under ADR-0041. No new application test harness or local release aggregate is justified by writing the proposal.

Future implementation needs both deterministic contract checks and representative agent-behavior evaluations of the acceptance scenarios. Measure missed or unsafe removals, repeated unnecessary checks and no-finding overhead before considering stronger automation.

The current request authorizes a publishable proposal and PR with evaluation and refinements. It does not accept the ADR, release a skill, install it elsewhere, change all target repositories or run future cleanup on their behalf. This phase is done when the original idea, evaluated policy, integration path, limitations and reviewable proposal are present and validated.
