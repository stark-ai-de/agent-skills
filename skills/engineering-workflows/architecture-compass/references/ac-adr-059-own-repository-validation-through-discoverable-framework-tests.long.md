# AC-ADR-059: Own repository validation through discoverable framework tests

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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Make contract failures attributable and discoverable without retaining an unowned script-driven validation system.

Variants: [Short](ac-adr-059-own-repository-validation-through-discoverable-framework-tests.short.md) · **Long, canonical** · [Guide](ac-adr-059-own-repository-validation-through-discoverable-framework-tests.guide.md)

## Context

Repository-maintenance checks can distribute assertions and orchestration across standalone scripts, package commands and CI calls. That makes ownership and selective execution hard to discover, while a migration can accidentally lose warning, failure or input-discovery behavior.

## Intent

Make every repository rule easy to find, run selectively and diagnose, while retaining the assurance supplied by the previous checks. Success is complete owned validation with useful feedback, not a chosen filename extension or an increased number of tests.

## Decision

A target SHALL express repository-maintenance contract assertions as discoverable tests in its selected framework, with that framework owning selection, lifecycle, failure propagation and reports. For JS/TS, select the runtime/tooling profile under the applicable local mapping of AC-ADR-058 and its runtime evidence rules. Other language or framework owners remain valid adaptations.

Before migration, inventory all in-scope rules, data inputs and live invocations, including validator-only `verify` commands, generator check modes and standalone assertion harnesses. Map each rule to a named test boundary or explicitly justified native/operational owner. Preserve semantic warnings, failures, cleanup and representative negative cases before deleting the old entrypoint.

“The test is the validator” prohibits an unframed repository validation system, not ordinary code reuse. Shared schemas, domain functions, parsers, reusable assertions, structured diagnostics and public/runtime validation APIs MAY remain importable. Production input/security guards MUST NOT be removed. Native lint/typecheck/build tools retain their gates; generators retain their real artifact-producing purpose. A whole old validator launched as one opaque test, or a custom runner hidden under Vitest, is not migration completion.

## Invariants

- Every applicable rule has an owner and a selectable execution path; no retired validator remains as a competing supported path without an owned transition exception.
- Tests detect changes to their current input set, including new, removed or renamed files; missing required roots and unexpected empty inventories cannot quietly pass.
- Import-graph filtering alone is insufficient for plain file reads. Selection and watch behavior must cover those dependencies or conservatively select the owning suite.
- Helpers do not validate the checkout, exit the process or launch a runner merely because they are imported.
- Framework discovery and positive/negative failure behavior, not filenames alone, establish ownership.

## Measurable outcomes

Completion requires `mapped_in_scope_rules / all_in_scope_rules = 1`, zero unowned live validator entrypoints, and detection of every declared negative scenario. Freeze and identify the input/rule inventory for each run; a zero denominator is explicitly not applicable, not 100 percent coverage. Track focused feedback time and diagnostic quality using a defined malformed fixture and target-approved latency budget.

## Adoption evidence

Record the local/provider mapping, intended user benefit, scope and exclusions, baseline subject/inventory, measurement command, unit/denominator, target, observed value, owner, enforcement stage and review trigger. Preserve original intent when adapting tools. Separate governance adoption from rollout completion and achieved metrics. Unmeasured or waived obligations cannot be represented as passed.

## Failure and exceptions

Missing mapping or semantic regression blocks completion. Preserve a reviewed transition path until parity exists. Promote a no-bare-validator guard through AC-ADR-018's evidence stages; test allowed operational APIs as well as forbidden cases. Exceptions identify scope, authority, owner, expiry/revisit and replacement proof. Historical prose, comments and production validators are not violations merely because their names match a search expression.

## Revisit

Reassess on new contract domains, changed source discovery, schema ownership, native tool integration or a material diagnosis/feedback regression. Use the local successor process for a changed accepted decision.

## Consequences

Framework ownership gives repository rules a discoverable execution and reporting path. Migration requires a maintained rule/input inventory and semantic parity evidence; shared domain logic and native tool gates continue under their existing owners.
