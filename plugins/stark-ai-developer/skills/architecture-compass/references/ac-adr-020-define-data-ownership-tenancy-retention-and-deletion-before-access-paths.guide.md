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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Define who owns data and its complete lifecycle before exposing storage or access paths.

Variants: [Short](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.short.md) · [Long, canonical](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Build the data-class matrix

Create one row per persisted or externally synchronized data class:

| Field                      | Questions to resolve                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Owner and authority        | Who is accountable, and which system is authoritative?                                   |
| Subject and tenant         | Which identifier scopes access, and can ownership change?                                |
| Purpose and classification | Why is it stored, and how sensitive is it?                                               |
| Access                     | Who may read, mutate, share, export, or administer it?                                   |
| Lifecycle                  | When is it active, archived, retained, held, and deleted?                                |
| Copies                     | Which caches, objects, indexes, backups, analytics, embeddings, or providers receive it? |
| Proof                      | Which policy, service, migration, job, and negative test enforces the rule?              |

Resolve retention with the appropriate product, legal, privacy, and operations owners; do not invent a universal duration in application code.

## Implement and test

1. Put subject and tenant keys in the owning schema and index the access paths that policies and services use.
2. Enforce isolation in database policies or repository/service boundaries and repeat authorization at privileged crossings.
3. Inventory asynchronous and provider copies when creating them, not after a deletion request arrives.
4. Implement deletion as a persisted, idempotent workflow with per-destination status and safe retries.
5. Test two tenants with overlapping-looking identifiers, ownership transfer if supported, suspended or deleted principals, repeated deletion, partial provider failure, and export boundaries.
6. Verify production policies, jobs, backup expiry, and provider deletion separately after deployment; keep local results labeled local.

Avoid using a broad administrative client for ordinary reads or writes. If a repair or deletion worker needs elevation, give it a narrow operation API and record actor, scope, reason, and outcome without copying deleted sensitive content into the audit record.

## Official sources

- [PostgreSQL row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase secure data and row-level security](https://supabase.com/docs/guides/database/secure-data)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)
- [OWASP User Privacy Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html)
