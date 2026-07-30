# AC-ADR-020: Define Data Ownership, Tenancy, Retention, and Deletion Before Access Paths

ID: AC-ADR-020
Title: Define Data Ownership, Tenancy, Retention, and Deletion Before Access Paths
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: security-data
Tags: data-ownership, tenancy, retention, deletion
Applies when: Introducing or changing persisted personal, tenant, device, generated, derived, or externally synchronized data.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Define who owns data and its complete lifecycle before exposing storage or access paths.

Variants: [Short](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.short.md) · **Long, canonical** · [Guide](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.guide.md)

## Context

Data models often start with fields and access endpoints while ownership, tenancy, retention, deletion, and downstream copies remain implicit. UI-level filtering cannot protect direct service, database, queue, export, or administrative paths. Deleting only a primary row can leave caches, objects, indexes, analytics, model artifacts, or provider copies accessible.

## Decision

Before a new persisted data class or access path is accepted, the repository defines its authoritative ownership and complete lifecycle and enforces those rules at every owning storage and service boundary.

### Ownership and access

- Name the business owner, system of record, approved purpose, data classification, and accountable maintainer for each data class.
- Define whether a subject, guardian, account, organization, workspace, device, or system owns or controls the data. Model tenant and subject identifiers explicitly where they are part of authorization.
- State read, create, update, share, export, and delete invariants for each principal and lifecycle state. Enforce them in database policies, schemas, service authorization, and storage prefixes as applicable, not only in UI queries.
- Treat cross-tenant, support, repair, analytics, and administrative access as named elevated operations with least privilege, auditability, and bounded credentials.
- Define provenance and conflict ownership for synchronized or imported records. A copy must identify its source, authority, and reconciliation behavior.

### Lifecycle

- Define creation trigger, active lifecycle states, archival behavior, retention period or decision source, legal or operational holds, deletion trigger, expected completion, and failure recovery.
- Apply the lifecycle to primary storage and all derived or duplicated representations: object storage, caches, search indexes, queues, replicas, exports, analytics, backups, embeddings, training or evaluation corpora, and model-generated artifacts.
- Derived data may not silently outlive the approved purpose of its source. Irreversible aggregation or anonymization requires documented validation that re-identification and subject linkage are no longer reasonably available for the intended context.
- Deletion is idempotent, observable, resumable after partial failure, and explicit about bounded backup expiry or other copies that cannot be removed immediately.
- Export preserves authorization, scope, provenance, and a stable contract without exposing another subject's or tenant's data.

### Proof and change control

Schema and policy tests exercise same-tenant success, cross-tenant denial, subject transitions, elevated-operation isolation, retention selection, repeated deletion, partial downstream failure, and export scope. Changes to ownership, tenant keys, retention, or deletion semantics use the migration and compatibility process rather than silently reinterpreting stored data.

Local schema and service tests do not prove deployed database policies, scheduled deletion jobs, backup expiry, or external-provider deletion. Report those as separate CI, deployed/production, or external evidence stages.

## Failure handling

Do not expose a new access path when ownership, tenant scope, retention, or deletion is unresolved. On partial deletion, preserve a minimal non-sensitive operation record, retry idempotently, surface the incomplete stage to the owning operator, and avoid falsely reporting completion.

## Acceptance criteria

- Every persisted data class appears in an owned lifecycle inventory.
- Tenant and subject isolation is enforced below the UI and has negative tests.
- Retention, deletion, export, derived copies, backups, and synchronized providers have explicit behavior.
- Elevated and cross-tenant operations are isolated, auditable, and least-privileged.
- Evidence distinguishes local contract proof from deployed storage and external-provider behavior.

## Consequences

Data design requires earlier cross-functional decisions and downstream inventory work. In return, authorization and lifecycle obligations become reviewable, testable, and operable before data spreads across systems.
