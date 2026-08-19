---
title: "Add CSV export to admin users table"
slug: "admin-users-csv-export"
artifact_path: "docs/specs/admin-users-csv-export-spec.md"
mode: "compact"
status: "draft"
owner: "admin-platform"
repo: "web-app"
created: "2026-05-21"
updated: "2026-05-21"
source_request: "Add CSV export for the users admin view"
---

# Add CSV export to admin users table

## Goal

Allow admins to export the currently filtered users table as a CSV file from the existing admin users page without changing table behavior or exposing sensitive fields.

## Scope

- In scope:
  - add one export action to the admin users page
  - export only the rows that match the current filters
  - include a stable CSV column order
- Out of scope:
  - background jobs
  - XLSX export
  - new permissions model

## Repo context

- Relevant files or areas:
  - `src/pages/admin/users.tsx`
  - `src/components/admin/UsersTable.tsx`
  - `src/lib/csv.ts` if it exists, otherwise add a local helper
- Existing commands or conventions:
  - use the existing admin action button pattern
  - keep current filter state as the export source of truth
- Unknown repo facts marked as unspecified:
  - exact shared CSV helper availability is unspecified

## Requirements

### Functional requirements

- WHEN an admin is on the users page, THE SYSTEM SHALL show an `Export CSV` action near the table controls.
- WHEN the admin clicks `Export CSV`, THE SYSTEM SHALL download a CSV containing only the rows matching the current filters.
- WHEN the table is empty after filters are applied, THE SYSTEM SHALL still download a CSV containing headers only.
- IF a field is sensitive or internal-only, THEN THE SYSTEM SHALL exclude it from the export.

### Constraints

- Keep current table rendering and filter logic unchanged.
- Do not add server-side export infrastructure.
- Exclude password hashes, internal tokens, notes, and raw audit blobs if present.
- Preserve existing admin-page styling and button placement conventions.

## File plan

- Update:
  - `src/pages/admin/users.tsx`
  - `src/components/admin/UsersTable.tsx`
- Add:
  - `src/lib/exportUsersCsv.ts` if no existing helper is suitable
- Avoid touching:
  - auth flows
  - user-edit forms
  - backend endpoints unless absolutely required

## Architectural decisions

- ADR required: no
- Existing ADRs consulted: none identified
- ADR draft or path: none
- Implementation blocked until ADR accepted: no

## Source challenge

- Repo evidence checked:
  - existing admin users page and table component should be inspected before implementation
  - current filter state must be confirmed as the export source of truth
- ADRs/specs checked:
  - none identified
- External docs checked or skipped:
  - skipped because CSV generation is local behavior unless the repo uses a shared export package
- Requirements revised:
  - none
- Requirements preserved:
  - export current filtered rows only
  - exclude sensitive/internal fields
- ADR gate result:
  - no durable architectural decision identified

## Validation

```bash
pnpm lint
pnpm test
pnpm exec playwright test admin-users-export.spec.ts
```

## Done when

- [ ] Admin users page shows an export action
- [ ] Downloaded CSV matches current filters
- [ ] Sensitive/internal fields are excluded
- [ ] Relevant automated checks pass

## Assumptions and open questions

- Assumption: current filter state is available client-side for export.
- Assumption: client-side CSV generation is acceptable for current dataset size.
- Open question: exact canonical list of exportable user columns is unspecified.
