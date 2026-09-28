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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Make contract failures attributable and discoverable without retaining an unowned script-driven validation system.

Variants: **Short** · [Long, canonical](ac-adr-059-own-repository-validation-through-discoverable-framework-tests.long.md) · [Guide](ac-adr-059-own-repository-validation-through-discoverable-framework-tests.guide.md)

## Decision summary

Move repository-maintenance contract assertions and their lifecycle into the selected test framework. Inventory rules and call sites by behavior, preserve positive and negative semantics, and complete the migration with zero unowned bare validation entrypoints. Keep native tool gates, operational commands and reusable production/domain validation logic under their legitimate owners. Do not merely wrap old validator processes or recreate a scheduler/reporter.

Prove current inputs, including additions/deletions and file-read dependencies, reach the right tests. Record intent, scope, rule coverage, diagnostics, feedback targets and evidence in target-native receipts. Unknown coverage is not success. Promote the anti-regression guard gradually with tested exceptions; resolve conflicts and waivers explicitly. Revisit when contract ownership or discovery changes.
