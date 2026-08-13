# ADR-0044: Select validation scope by trust context and owned gates

ID: ADR-0044
Title: Select validation scope by trust context and owned gates
Status: Superseded
Date: 2026-08-12
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, ci, validation, artifacts, release
Applies when: Maintaining hosted validation scope, required checks, or trusted validation proof.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0041, ADR-0043
Superseded by: ADR-0046
Guide verified: 2026-08-12
Gist: Pull requests run a fail-closed union of affected owned gates, while main and manual validation remain full and trusted proof remains full-only.

Variants: [Short](0044-select-validation-scope-by-trust-context-and-owned-gates.short.md) · **Long, canonical** · [Guide](0044-select-validation-scope-by-trust-context-and-owned-gates.guide.md)

## Decision

We will keep the required `Validate` workflow unfiltered and its `validate` job always created for pull requests, every push to `main`, and every manual dispatch. Every main push and manual dispatch will run the complete declared validation gate set. A pull request may run only the gates owned by its changed contracts, while retaining the same required job identity and producing a versioned validation plan and report.

For pull requests, the candidate planner will compare the exact event base SHA with the checked-out candidate, execute a compatible planner materialized from each revision, and take the union of their requested gates. The effective scope becomes full if the base planner is absent, either plan is malformed or schema-incompatible, either plan requests full validation, a gate is unknown, a path is unclassified, or a global validation input changes. The runner will execute each selected gate exactly once and fail closed on missing, skipped, timed-out, failed, or mutating gates. This union is a drift-safety mechanism; repository review and branch protection remain the trust boundary.

Only successful full validation in an authorized trusted-main context may produce the Pages artifact, validation receipt, deployment, or reusable release proof. Affected pull-request runs may publish diagnostic reports only. Trusted receipts will bind the scope, plan and manifest digests, exact gate set and results, candidate fingerprints, and required artifact evidence; publication must reject affected, incomplete, incompatible, or contradictory proof.

## Why

- Small documentation and isolated skill changes do not need unrelated mutation-heavy validators to prove their owning contracts.
- Keeping the workflow and required job unfiltered preserves a stable branch-protection status in every event.
- Base and candidate union allows mappings to evolve without allowing a normal refactor to silently narrow the prior planner's known obligations.
- Full main and manual runs provide an operational escape hatch and keep every trusted artifact tied to complete integrated proof.
- Versioned plan/report/receipt digests make selection and proof reviewable without treating caches or prior runs as current evidence.

## Options

- Chosen: One always-created required job, affected pull-request planning with base/candidate union and fail-full behavior, and full trusted-main/manual validation.
- Rejected: Workflow-level path filters, because they can omit the required check and make completeness depend on trigger filtering.
- Rejected: Candidate-only planning, because mapping changes can accidentally narrow their own validation before the new mapping is established.
- Rejected: Base-planner output as an adversarial security boundary, because the candidate still controls executable workflow and runner code.
- Rejected: Reusable proof from affected runs, because a subset does not establish the complete Pages and release boundary.
- Rejected: Full validation for every pull request indefinitely, because measured cost is dominated by unrelated fixture work.

## Consequences

- Good: Pull-request validation cost follows changed contracts while the required-check name and event coverage stay stable.
- Good: Full main/manual validation and exact attempt-bound release proof preserve current artifact ownership.
- Good: Unknown or contradictory planning fails safely to more validation.
- Tradeoff: Gate ownership patterns, schema compatibility, and global invalidators require focused review and tests.
- Tradeoff: The first pull request introducing the planner remains full because its base lacks compatible planning code.
- Risk: Incorrectly broad ownership reduces optimization; incorrectly narrow ownership is mitigated by base union, unmatched-path fallback, full trusted contexts, and branch review.

## Follow-up

- Record post-merge affected-plan examples and trusted-main receipt v2 evidence separately from local proof.
- Revisit cross-gate concurrency, targeted smoke cases, and output caching only through later measured changes.
