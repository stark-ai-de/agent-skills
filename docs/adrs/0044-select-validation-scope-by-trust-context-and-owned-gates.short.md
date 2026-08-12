# ADR-0044: Select validation scope by trust context and owned gates

ID: ADR-0044
Title: Select validation scope by trust context and owned gates
Status: Accepted
Date: 2026-08-12
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: github-actions, ci, validation, artifacts, release
Applies when: Maintaining hosted validation scope, required checks, or trusted validation proof.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0041, ADR-0043
Superseded by: None
Guide verified: 2026-08-12
Gist: Pull requests run a fail-closed union of affected owned gates, while main and manual validation remain full and trusted proof remains full-only.

Variants: **Short** · [Long, canonical](0044-select-validation-scope-by-trust-context-and-owned-gates.long.md) · [Guide](0044-select-validation-scope-by-trust-context-and-owned-gates.guide.md)

## Decision

We will keep the required `Validate` workflow unfiltered and its `validate` job always created for pull requests, every push to `main`, and every manual dispatch. Every main push and manual dispatch will run the complete declared validation gate set. A pull request may run only the gates owned by its changed contracts, while retaining the same required job identity and producing a versioned validation plan and report.

For pull requests, the candidate planner will compare the exact event base SHA with the checked-out candidate, execute a compatible planner materialized from each revision, and take the union of their requested gates. The effective scope becomes full if the base planner is absent, either plan is malformed or schema-incompatible, either plan requests full validation, a gate is unknown, a path is unclassified, or a global validation input changes. The runner will execute each selected gate exactly once and fail closed on missing, skipped, timed-out, failed, or mutating gates. This union is a drift-safety mechanism; repository review and branch protection remain the trust boundary.

Only successful full validation in an authorized trusted-main context may produce the Pages artifact, validation receipt, deployment, or reusable release proof. Affected pull-request runs may publish diagnostic reports only. Trusted receipts will bind the scope, plan and manifest digests, exact gate set and results, candidate fingerprints, and required artifact evidence; publication must reject affected, incomplete, incompatible, or contradictory proof.

## Context

- Full validation makes small pull requests wait on unrelated fixture-heavy gates.
- Workflow path filters can omit a required status rather than safely reduce its internal work.
- Trusted artifacts require complete integrated proof, while pull-request diagnostics can be narrower when selection fails closed.

## Consequences

- Good: Pull-request latency follows changed contract ownership without changing the required-check identity.
- Good: Main, manual, Pages, and release proof stay complete and auditable.
- Tradeoff: The planner manifest becomes a reviewed validation contract and unknown inputs deliberately lose optimization.
- Risk: Candidate-controlled planning is not tamper resistance; branch protection and review remain the trust boundary.
