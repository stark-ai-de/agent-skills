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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Define who owns data and its complete lifecycle before exposing storage or access paths.

Variants: **Short** · [Long, canonical](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.long.md) · [Guide](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.guide.md)

## Decision summary

Every persisted data class has an authoritative business owner, tenant or subject boundary, purpose, access invariant, retention rule, and deletion behavior before read or write paths are exposed. Enforcement lives in schemas, policies, and services at the owning boundary rather than in UI filtering.

The lifecycle covers primary rows and objects plus caches, indexes, replicas, exports, backups, analytics, embeddings, model artifacts, and synchronized copies. Cross-tenant access and elevated maintenance operations are explicit, auditable exceptions. Deletion and export are tested end to end, including partial failure and bounded completion.

## Read next

Read the [Long variant](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.long.md) before adding a data type, tenant key, synchronization, retention rule, export, or deletion path. Load the [Guide](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.guide.md) for a data-class matrix and lifecycle test procedure.
