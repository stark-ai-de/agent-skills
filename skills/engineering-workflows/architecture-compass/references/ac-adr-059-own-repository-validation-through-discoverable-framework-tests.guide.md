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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Make contract failures attributable and discoverable without retaining an unowned script-driven validation system.

Variants: [Short](ac-adr-059-own-repository-validation-through-discoverable-framework-tests.short.md) · [Long, canonical](ac-adr-059-own-repository-validation-through-discoverable-framework-tests.long.md) · **Guide**

This Guide is non-normative; the Long controls. Use the [testing outcome receipt](../assets/testing-outcome-receipt-template.md) in the target's existing evidence convention and the [Vitest 4 profile](../assets/vitest4-testing-profile.md) only when its stack applies.

Begin with package/workspace scripts, workflow calls and executable behavior, not a `validate-*` filename count. Build a small rule-to-test mapping. Use focused `describe`/`test` cases, deterministic current-data enumeration and minimal fixture builders. Import shared domain logic when useful; do not run every old CLI as a one-line wrapper test.

For the Vitest 4 profile, name disjoint projects and use explicit inheritance. Add global watch mappings for Markdown/JSON/YAML read through filesystem APIs. Check add/delete/rename as well as edits; affected-check selection may need a separate input ownership map. Keep a target-native typecheck command where applicable.

A migration receipt should show rule mapping coverage, old/new representative outcomes, diagnostic output for malformed input, and measured focused feedback time. An independent expected inventory prevents a broken enumerator from defining its own passing expectation.

Verification examples: a missing required schema fails; a newly added invalid file is collected; a release CLI continues to work without importing Vitest; the guard permits a public schema validator but rejects an auto-running repository check. No observed baseline means no improvement claim.

## Related decisions

Use AC-ADR-018 for enforcement stages, AC-ADR-021/022 for migration and delivery, AC-ADR-049 for validation evidence and AC-ADR-058 for applicable runtime/tooling selection.

## Sources

Current API references: [V4 projects](https://v4.vitest.dev/guide/projects), [watch mappings](https://v4.vitest.dev/config/watchtriggerpatterns), [type testing](https://v4.vitest.dev/guide/testing-types).
