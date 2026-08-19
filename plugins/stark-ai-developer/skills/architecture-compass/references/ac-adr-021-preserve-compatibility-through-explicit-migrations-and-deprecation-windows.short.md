# AC-ADR-021: Preserve Compatibility Through Explicit Migrations and Deprecation Windows

ID: AC-ADR-021
Title: Preserve Compatibility Through Explicit Migrations and Deprecation Windows
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: migration, compatibility, deprecation, data-change
Applies when: Changing schemas, APIs, events, public exports, runtimes, stored data, or accepted ADR contracts.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Declare compatibility direction and move through observable expand, migrate, and contract stages with an owned exit.

Variants: **Short** · [Long, canonical](ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.long.md) · [Guide](ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.guide.md)

## Decision summary

Every contract or stored-data change identifies producers, consumers, compatibility direction, migration state, rollback constraints, and the owner and deadline of any deprecation. Compatible capacity is added before consumers move; data is backfilled or translated with observable, resumable work; old capacity is removed only after verified adoption and a separately authorized contract gate.

Irreversible or destructive steps require explicit approval, recoverability evidence, and a stop condition. Accepted architectural intent changes through a successor ADR, never a silent rewrite. Local migration tests do not prove CI compatibility, published consumer adoption, production backfill, or third-party cutover.

## Read next

Read the [Long variant](ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.long.md) before changing a durable contract or deleting old capacity. Load the [Guide](ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.guide.md) for an expand/migrate/contract worksheet and verification sequence.
