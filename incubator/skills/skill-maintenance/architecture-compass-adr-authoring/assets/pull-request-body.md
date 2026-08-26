# Pull Request Body

Use this template as a starting point. Remove instructional placeholders before creating the pull request.

## Summary

- Add `<AC-ADR-ID>` to Architecture Compass.
- Add `<ADR-ID>` as the repository-local adoption.
- Synchronize the affected catalogs, lineage, instructions, locks, and generated plugin projection as required.

## Requirements

- `<generic requirement>`
- `<generic requirement>`

### Assumptions and non-goals

- Assumption: `<assumption or "None">`
- Non-goal: `<explicit exclusion or "None">`

## ADRs

| Surface              | ID            | Status     | Scope        | Files             |
| -------------------- | ------------- | ---------- | ------------ | ----------------- |
| Architecture Compass | `<AC-ADR-ID>` | `<status>` | `<scope>`    | `<triplet paths>` |
| Repository adoption  | `<ADR-ID>`    | `<status>` | `repository` | `<triplet paths>` |

## Conflicts and review decisions

| ADR or PR                 | Status     | Relationship                          | Conflict           | Affected scope | Proposed resolution |
| ------------------------- | ---------- | ------------------------------------- | ------------------ | -------------- | ------------------- |
| `<ID/link or None found>` | `<status>` | `<overlap/adapts/diverges/successor>` | `<exact conflict>` | `<scope>`      | `<review decision>` |

The proposed ADR remains in this PR even when a conflict is listed. Accepted history is unchanged unless this PR explicitly contains an authorized successor transition.

## Synchronization

- `<catalog/index update>`
- `<lineage or lock update, or reason not required>`
- `<instruction/documentation update, or reason not required>`
- `<generated projection command and result>`

## Validation

| Check                                   | Result                    | Evidence           |
| --------------------------------------- | ------------------------- | ------------------ |
| `npm run validate:skills`               | `<passed/failed/not run>` | `<concise result>` |
| `npm run list:incubator`                | `<passed/failed/not run>` | `<concise result>` |
| `npm run validate:adrs`                 | `<passed/failed/not run>` | `<concise result>` |
| `npm run validate:architecture-compass` | `<passed/failed/not run>` | `<concise result>` |
| `npm run validate:projections`          | `<passed/failed/not run>` | `<concise result>` |
| `pnpm format:check`                     | `<passed/failed/not run>` | `<concise result>` |
| `git diff --check`                      | `<passed/failed/not run>` | `<concise result>` |

## Evidence limits

- Hosted CI: `<pending/not observed/result>`
- Publication or installation: not implied by this PR.
- Deployment or production: not in scope.

## Review checklist

- [ ] Requirements are generic and readable.
- [ ] Long contains one canonical decision.
- [ ] Short is compact and does not change Long.
- [ ] Guide is non-normative and current-source claims are dated.
- [ ] Both ADR namespaces use independent live IDs.
- [ ] Conflicts are explicit and accepted history is preserved.
- [ ] Generated plugin files came from the owning sync command.
- [ ] Validation gaps are visible.
