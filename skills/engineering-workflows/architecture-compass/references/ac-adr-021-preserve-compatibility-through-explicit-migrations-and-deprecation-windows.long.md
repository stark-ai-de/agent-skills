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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Declare compatibility direction and move through observable expand, migrate, and contract stages with an owned exit.

Variants: [Short](ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.short.md) · **Long, canonical** · [Guide](ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows.guide.md)

## Context

Deployments, workers, clients, stored records, events, packages, and external consumers rarely change at the same instant. A locally valid breaking change can strand older code, corrupt mixed-version writes, or make rollback impossible. Compatibility shims and dual-write paths can create a different risk when they have no owner or end condition.

## Decision

Every change to a persisted or consumed contract declares its compatibility model and proceeds through explicit expand, migrate, and contract stages unless an approved atomic maintenance boundary proves that staged compatibility is unnecessary.

### Contract inventory and direction

- Identify all known producers, consumers, stored representations, deployment order constraints, external owners, and supported version combinations.
- State whether compatibility is backward, forward, bidirectional, translated at a boundary, or intentionally breaking. Define the minimum supported old and new versions during the transition.
- Treat database schemas, serialized data, events, URLs, public package exports, configuration, command interfaces, files, model/tool schemas, and accepted ADR contracts as compatibility surfaces when another component or human relies on them.
- Assign one migration owner, consumer owners, a target completion date, observability, and an explicit condition for removing old capacity.

### Expand, migrate, contract

- Expand first by adding compatible fields, endpoints, event versions, adapters, exports, or readers without removing behavior required by supported consumers.
- Migrate producers and consumers in an order that remains valid across supported mixed versions. Translation and dual-read or dual-write paths are bounded transition mechanisms, not permanent architecture by default.
- Backfills are idempotent, resumable, observable, rate-limited to protect the live system, and verified by reconciliation rather than job completion alone.
- Contract only after adoption and data reconciliation meet the declared threshold, rollback no longer requires the old surface, external consumers have completed their window, and the destructive step receives its own authorization.
- Remove temporary flags, translators, shadow fields, metrics, and fallback code as part of the owned exit rather than leaving them indefinitely.

### Destructive and irreversible work

Schema drops, destructive transforms, one-way rewrites, history deletion, incompatible event publication, and loss of rollback capacity are explicit approval boundaries. Before execution, resolve exact targets, backups or alternate recovery, restore verification, maintenance constraints, stop thresholds, and the last reversible point. A backup name without a tested recovery path is not sufficient evidence.

### Deprecation and architectural history

A deprecation communicates replacement, affected consumers, owner, support window, telemetry or discovery method, removal condition, and failure behavior after removal. Silent fallback must not hide whether consumers migrated.

When an accepted ADR's durable decision changes, create a successor and record reciprocal supersession. A mechanical document migration may preserve wording and status; it cannot reinterpret the historical outcome.

### Evidence stages

Record source/static compatibility analysis, local old/new matrix tests, CI matrix results, published package or artifact proof, deployed migration and reconciliation evidence, and external-consumer confirmation separately. A local backfill fixture or CI migration test does not prove production data completion or third-party adoption.

## Failure handling

Stop the transition when reconciliation diverges, error or latency thresholds are exceeded, an unplanned consumer appears, rollback cannot be executed, or the target set has drifted. Keep the system in the last supported mixed-version state, repair or reverse through the documented path, and require new authorization before an irreversible retry.

## Acceptance criteria

- Producers, consumers, compatibility direction, supported version matrix, and deployment order are explicit.
- Backfills and translators are idempotent, observable, and owned through removal.
- Destructive work has exact authorization, a last reversible point, and tested recovery appropriate to its risk.
- Deprecations have a replacement, deadline, consumer evidence, and removal condition.
- Architectural decision changes use successor ADRs, and evidence reports distinguish local from deployed and external completion.

## Consequences

Staged compatibility temporarily increases code and operational complexity. It preserves safe deployment and rollback, exposes migration progress, and prevents compatibility code from becoming unowned permanent behavior.
