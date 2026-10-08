# AC-ADR-064: Preserve Approved Scope Through Capability-Aware Planning

ID: AC-ADR-064
Title: Preserve Approved Scope Through Capability-Aware Planning
Status: Accepted
Date: 2026-09-21
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, intent-routing, planning, approval, governance-persistence
Applies when: Architecture Compass selects workflows, plans architecture changes, confirms a result, or persists approved governance across host transitions.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-048
Superseded by: none
Guide verified: 2026-09-21
Gist: Preserve five workflows and one concrete approval while adapting planning controls to observed host capabilities.

Variants: [Short](ac-adr-064-preserve-approved-scope-through-capability-aware-planning.short.md) · [Long, canonical](ac-adr-064-preserve-approved-scope-through-capability-aware-planning.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls. AC-ADR-048 remains historical context only.

## Activation routing

Expose the complete workflow set on every activation, plus the selected route and reason. Keep that announcement compact; the expanded receipt fields below are reference fields for material scope, state, or approval evidence, not questions to ask or a mandatory opening block:

```text
Available workflows: setup | audit | refactor | plan-refactor | plan-run-refactor
Selected: <workflow or unresolved>
Setup coverage: recommended | complete | not-applicable
Reason: <task evidence>
Write scope: <read-only or exact authorized paths>
Expected artifacts: <reports, ADRs, plan, receipts, code>
Planning capability: <Active | Available but inactive | Unavailable | Explicitly declined | Indeterminate | Not applicable; evidence>
Protected state: <staged, unstaged, untracked, ignored, external>
Separate approvals: <destructive, paid, deployment, publication, production, scope expansion>
```

Proceed after announcing the route when one workflow is supported by clear task intent and authority. Ask when the request is bare, contradictory, or ambiguous about outcome, scope, persistence, governance, or mutation. Do not introduce an `auto` label.

Use this routing table:

| Intent evidence                                                               | Route               |
| ----------------------------------------------------------------------------- | ------------------- |
| Establish or reconcile ADR governance                                         | `setup/recommended` |
| Review architecture, ADR coverage, drift, or risk                             | `audit`             |
| Produce a refactoring plan without execution                                  | `plan-refactor`     |
| Implement broad architecture work or resolve durable choices before execution | `plan-run-refactor` |
| Execute explicit bounded work under accepted local ADRs                       | `refactor`          |

## Legacy intent mapping

Older input labels do not add public workflows. Route them by requested outcome and current governance:

| Legacy intent                            | Current route                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `setup-existing-repo`                    | `setup` with evidence-based coverage.                                                                                                    |
| `setup-new-repo` or `new-repo-bootstrap` | `setup`; application bootstrap remains a separate planned implementation.                                                                |
| `pr-review`                              | read-only `audit`.                                                                                                                       |
| `new-implementation`                     | bounded `refactor` when accepted ADRs govern the whole slice; otherwise `plan-run-refactor`.                                             |
| `docs-sync`                              | bounded `refactor` when accepted governance resolves the sync; otherwise the Plan workflow matching whether execution is requested.      |
| `stack-deviation`                        | bounded `refactor` when accepted governance resolves the deviation; otherwise the Plan workflow matching whether execution is requested. |

Preserve the current workflow name in reports and receipts so the compatibility mapping cannot become a hidden sixth workflow.

## Setup procedure

1. Inspect repository-native ADR, instruction, validation, receipt, and Git conventions without changing them.
2. For `recommended`, select only decisions supported by target evidence. If the repository is new or lacks architecture evidence, use AC-ADR-005, 006, 018, 019, 021, 022, and 049 as the initial candidate foundation.
3. For `complete`, evaluate every Accepted, adoptable target-repository AC-ADR and record `adopt`, `adapt`, `defer`, or `reject`.
4. Allocate repository-native IDs without renumbering or rewriting accepted records. Split provider concerns when the target's one-decision-per-ADR convention requires it.
5. Record every `AC-ADR -> local ADR` mapping, non-selected disposition, conflict, deviation, and source evidence.
6. Bind accepted local ADRs through supported agent instructions and record the repository-native validation receipt location.
7. Validate the governance artifacts only. Setup does not authorize application refactoring, deployment, production probes, or publication.

For each disposition, `adapt` records the active target rule and its deviation from the provider candidate; `defer` records the trigger, owner, and resumption condition; and `reject` records the governing authority and rationale.

## Stable public workflow instruction check

Classify the generic intent-bound selector instruction as:

- `applicable`: target evidence proves a stable public skill repository with at least one skill exposing multiple material workflows;
- `not applicable`: target evidence proves that contract does not apply; or
- `indeterminate`: stability or workflow materiality cannot be established.

For Setup, preserve an equivalent target rule or add a generic instruction that requires finite disclosure, intent-bound selection, ambiguity fallback, and separate action approvals. Audit reports the classification only. `indeterminate` never writes. Do not copy this provider ADR ID into the target; map or create a repository-native decision only when target governance requires it.

## Audit procedure

Inspect repository evidence and report:

- applicable accepted ADRs, conflicts, missing coverage, and implementation drift;
- architecture boundaries, dependency direction, migration risk, and protected state;
- validation obligations, fresh reusable receipts, invalidated evidence, and claim limits; and
- the selector-instruction classification when applicable.

Audit creates no repository artifact, repairs no file, installs no tool, and performs no deployment, publication, production, or mutating environment probe.

## Refactor procedure

Use direct `refactor` only when accepted local ADRs already govern the complete bounded change and the user has authorized its write scope. Capture risk, proof obligations, evidence reuse, rollback, and stop conditions before mutation. Execute reversible slices, verify at the owning boundary, and stop on decision conflict, material drift, or required scope expansion.

If governance is missing, route to `setup`. If durable decisions or broad sequencing remain unresolved, route to `plan-refactor` or `plan-run-refactor`. Never silently combine those workflows under direct refactor.

### Iterative simplification

Use this optional procedure when reducing custom code, unnecessary abstraction, or duplication is part of the authorized `refactor` or approved `plan-run-refactor` execution. A request to repeat "until no optimizations remain" means reaching a supported stopping point within that scope; it does not expand write authority. `audit` can identify candidates without applying them, and plan-only work stops before implementation. Existing local decisions continue to govern ownership, dependencies, compatibility, and proof.

#### Establish the scope and baseline

- Record the starting revision plus relevant dirty-tree identity, exact path/language scope, exclusions, protected changes, and repository formatter/counter. Inspect every file in the agreed inventory; a PR diff is only a starting map when the request covers whole services or a repository. Track inspected and unavailable files without silently narrowing the scope.
- Inspect manifests, lockfiles, supported runtimes, public exports, callers, tests, and accepted contracts. Use available semantic/AST tools when useful; record their actual coverage. If unavailable, use imports/callers, search, compiler, and tests without claiming an equivalent complete call graph. Static reachability alone cannot prove dynamic consumers absent.
- Measure before and after with the same scope, counter, and formatting. Unless the repository defines another LOC metric, count physical lines including blank/comment lines and label that choice. Report handwritten production, tests/fixtures, documentation/configuration, and generated/vendor code separately, with the handwritten total. Count new helpers, adapters, manifests, and support code as additions wherever they live; moving code between categories or files is not a saving. Disclose generated/lockfile growth separately.
- Keep the initial baseline fixed for cumulative savings and identify each pass's starting candidate for incremental deltas. Formatting-only changes, compressed statements, deleted explanations, weakened types, or removed coverage do not qualify as simplification.

#### Find and qualify candidates

Prefer deletion of proven redundant layers and supported capabilities already supplied by the language/runtime, framework, installed libraries, or an existing shared owner. Consider a new dependency only after checking these options and its maintenance, security, license, runtime, bundle/startup, and upgrade costs. A shorter call site alone does not justify a dependency or an adapter layer.

| Candidate                                                                     | Evidence needed before replacement                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pass-through wrapper, duplicate DTO, defensive branch, or compatibility layer | Callers and supported contracts show it has no remaining ownership, runtime, compatibility, or failure-handling role. Schema/type inference is suitable for internal duplication; preserve independently required public-contract drift checks. |
| Similar implementation in several consumers                                   | Same semantics and compatible runtime audience, with a real existing owner. Share the smallest coherent capability; do not create a speculative package, options-heavy framework, or cross-runtime import to remove a few lines.                |
| Handwritten parsing, validation, stream handling, or lifecycle code           | The supported API in the resolved framework/library version covers the actual contract. Inspect installed types/source and version-matched documentation; do not assume latest documentation matches the lockfile.                              |
| Repeated test fixtures or test cases                                          | A shared fixture or parameterized test preserves every distinct input, assertion, failure scenario, isolation requirement, and useful case name. Similar-looking fixtures may encode intentionally different states.                            |

For each candidate, record the removed responsibility, affected consumers, replacement owner/API/version, expected net saving including support code, proof obligation, and disposition. Keep this compact in the existing task receipt; do not create a permanent optimization framework or a second validation ledger.

Check semantic equivalence where relevant: accepted/rejected inputs, defaults/coercion/unknown keys, serialization and fingerprints, bytes versus characters and split Unicode, body bounds, timeout/cancellation/cleanup, errors and redaction, retry/idempotency/ordering, authentication and ownership checks, and browser/server boundaries. A library may own the mechanism while a small adapter retains necessary product policy. Reject the replacement when preserving that policy costs more complexity than it removes or when required behavior remains unproven.

Examples are candidates, not stack mandates: infer an internal type from its existing schema; reuse an installed strict-object API; replace a hand-built bounded stream collector with a compatible library; or consolidate truly identical fixtures. Do not change validation policy, resource limits, retries, security checks, public DTOs, or failure outcomes merely to use a library.

#### Execute, verify, and repeat

1. Select a coherent reversible slice inside the authorized scope and identify its owning-boundary proof using the existing AC-ADR-049 mapping. Resolve material contract uncertainty before changing it. Routine choices already covered by authority do not need repeated confirmation.
2. Apply the simplification, update its callers, and remove newly unused code, imports, and dependencies only after checking all consumers. Preserve pre-existing work. Review the integrated diff for behavior changes and abstraction overhead.
3. Run the repository formatter and the required focused type, lint, build, or behavior checks. Add a regression test only for a changed contract, demonstrated defect, critical boundary, or mandatory gate. Do not run the full suite after every small edit or duplicate valid evidence; an affected receipt must be refreshed and mandatory final gates still apply.
4. Measure the formatted result against both baselines, including new tests and helpers. Retain a candidate as a code reduction only when the agreed handwritten total falls and maintenance complexity improves with required behavior proved. Report a beneficial but size-increasing correctness change separately; it cannot satisfy a requested net-reduction goal by relabeling its additions.
5. After retained changes, search again: deletion or centralization can expose another removable layer. Update candidate dispositions and coverage, then repeat while qualifying work remains. Do not stop merely because the first pass or tests succeeded. Revisit a rejected candidate only when new evidence changes its reason.

On failed proof, stop dependent edits, localize the failure, and repair within the same authority or revert only the agent-owned slice without overwriting other work. Do not count an unverified or reverted reduction as achieved. Preserve independent verified improvements; unresolved required validation is a blocker, not convergence.

#### Stop and report

Convergence requires a complete final pass over the agreed inventory and affected consumers that finds no remaining candidate meeting the semantic, maintenance, scope, and measured-reduction criteria. Record retained changes, remaining candidates with rejection/defer reasons, inventory coverage, per-pass and cumulative deltas, proof receipts, and the exact stopping reason in the optional simplification section of the refactor report.

If missing evidence/capability prevents necessary proof, validation fails, scope or accepted decisions conflict, or an explicit resource budget is reached, report the limitation and resumption condition. Those are bounded stops, not evidence that opportunities are exhausted. Do not invent a pass limit for an open-ended repetition request, promise a global optimum, or keep churning on rejected candidates solely to reduce lines.

Reusable request after choosing the appropriate workflow:

> Within `<paths/languages>` and the accepted local decisions, reduce handwritten code and maintenance cost. Prefer compatible runtime/framework/installed-library capabilities and proven shared owners. Preserve public behavior and required proof. Repeat discovery, simplification, validation, and measurement until a complete pass finds no qualifying candidate; report coverage, net deltas, rejected candidates, and any blocking limit.

## Plan workflows

For both plan routes:

1. Observe the execution host's planning and permission capabilities independently through the AC-ADR-036 Guide. Respect active/explicitly requested Plan. Recommend Plan for substantial ambiguous work, but continue permitted read-only discovery and conversation when controls are inactive, missing, declined, or unknown. Do not invent host controls or treat unknown state as write permission.
2. Inspect discoverable facts, reuse prior answers, and resolve only open material decisions. Derive persistence intent and paths from the task and repository; bundle unresolved destination, directory, overwrite, and governance actions at the final checkpoint.
3. Prepare the complete reviewable draft, including exact scope, protected state, proof obligations, receipts, rollback, and separate approval boundaries. Ask positively to approve that version and its named save actions. Reuse a prior approval of the same version/scope; a native final approval can serve this checkpoint when its actual semantics confirm both. A mode toggle alone is not content approval.
4. Keep the approval while awaiting any required Plan exit or permission. Exit active Plan before mutation. If state is unknown, continue no-write work only until it is resolved. Do not repeat the unchanged approval after exit.
5. Recheck repository, target paths, authority, and protected state before persistence. If content, write scope, destination, or target state changed materially, resolve only the affected change. A specific instruction to change A and save authorizes that bounded revision without an extra ceremony; new ambiguity still asks.
6. For `plan-refactor`, persist only the approved specification and required ADR/index artifacts when authorized, validate and report actual paths, emit a bounded handoff, then stop before implementation. Keep Proposed ADR persistence separate from acceptance. Explicit chat-only delivery completes that delivery and reports persistence as not requested.
7. For `plan-run-refactor`, persist and validate the same required governance slice, then recheck HEAD, index, working tree, authority, dependencies, and external state. Stop dependent execution on material drift; otherwise execute only the unchanged approved plan. An outer task may resume separately authorized implementation after a planning-only handoff.
8. Use structured or asynchronous questions only when exposed. While a required answer is pending, continue only independent authorized work. Silence, timeout, and preselected answers are not approval.

Record approval identity/scope and actual persistence separately. Do not claim a save, ADR acceptance, or implementation from an approved draft alone.

## Risk-based validation receipt

Use the locally adopted AC-ADR-049 mapping to record:

```text
Risk: low | moderate | high | critical
Cadence: reuse | final-batch | checkpointed | reproduce-first
Proof obligations and one owner each:
Reused receipts and reconciliation:
Invalidated receipts and targeted reruns:
Final aggregate gate:
Environment path: none | representative Preview | eligible production fallback
Separate external authorization: <evidence | absent>
```

Do not call local, focused, or Preview evidence production proof. Deployment, publication, production, traffic, destructive migration, and other external actions retain their own approvals.

## Validation

Select focused checks from the changed governance contract and owning boundary. Run an aggregate only when a mandatory gate or distinct proof obligation requires it; content freeze alone is not a reason to execute `npm run validate`. Target repositories use their own confirmed commands and repository-native receipt location. If the user explicitly excludes validation, do not run it; record any mandatory gate as unmet and keep completion blocked.

## Decision lineage

- `adapts`: [ADR-0038](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md).

## Source

- [Agent Skills specification](https://agentskills.io/specification), verified 2026-09-21.

## Revisit

Create a reciprocal successor if the public workflow set, setup coverage model, intent-routing authority, direct-refactor boundary, or Plan lifecycle changes materially. Host-version mechanics and examples may be updated in this Guide when they do not change the canonical decision.
