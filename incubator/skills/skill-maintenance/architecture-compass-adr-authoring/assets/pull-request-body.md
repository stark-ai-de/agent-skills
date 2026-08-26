# Pull Request Body

Use this template as a starting point. Remove instructional placeholders before creating the pull request.

## Requirements

- `<generic requirement>`
- `<generic requirement>`

### Assumptions and non-goals

- Assumption: `<assumption or "None">`
- Non-goal: `<explicit exclusion or "None">`

## Summary

- Add `<AC-ADR-ID>` to Architecture Compass.
- Add `<ADR-ID>` as the repository-local adoption.
- Synchronize the affected validator inventory, catalogs, lineage, locks, release metadata, instructions, and generated plugin projection.

## ADRs

| Surface              | ID            | Status                              | Scope               | Files             |
| -------------------- | ------------- | ----------------------------------- | ------------------- | ----------------- |
| Architecture Compass | `<AC-ADR-ID>` | `Accepted` (intended after merge)   | `target-repository` | `<triplet paths>` |
| Repository adoption  | `<ADR-ID>`    | `<Proposed or explicitly approved>` | `repository`        | `<triplet paths>` |

## Conflicts and review decisions

| ADR or PR                 | Status     | Relationship                          | Conflict           | Affected scope | Proposed resolution | Decision owner |
| ------------------------- | ---------- | ------------------------------------- | ------------------ | -------------- | ------------------- | -------------- |
| `<ID/link or None found>` | `<status>` | `<overlap/adapts/diverges/successor>` | `<exact conflict>` | `<scope>`      | `<review decision>` | `<owner>`      |

Both proposed triplets remain in this PR even when a conflict is listed. Accepted history is unchanged unless this PR explicitly contains an authorized successor transition.

## Remaining review decisions

- `<owner>: <unresolved choice, or "None">`

## Synchronization

- `<Architecture Compass validator inventory and catalog update>`
- `<lineage disposition and accepted-decision lock update>`
- `<repository ADR index and local lock update, or reason not required>`
- `<instruction/documentation update, or reason not required>`
- `<skill, package, changelog, and plugin release metadata update>`
- `<generated projection command and result>`

## Validation

Candidate: `<commit SHA>`
Observed: `<UTC timestamp>`

Use only `verified`, `failed`, `not run`, `unavailable`, or `stale` as status values.

| Stage | Check                                                | Status     | Evidence or limitation |
| ----- | ---------------------------------------------------- | ---------- | ---------------------- |
| local | `npm run validate:skills`                            | `<status>` | `<concise result>`     |
| local | `npm run validate:adrs`                              | `<status>` | `<concise result>`     |
| local | `npm run validate:architecture-compass`              | `<status>` | `<concise result>`     |
| local | `npm run validate:projections`                       | `<status>` | `<concise result>`     |
| local | `npm run release:intent -- --base-ref origin/main`   | `<status>` | `<concise result>`     |
| local | `npm run release:validate -- --base-ref origin/main` | `<status>` | `<concise result>`     |
| local | `pnpm format:check`                                  | `<status>` | `<concise result>`     |
| local | `git diff --check origin/main...<candidate>`         | `<status>` | `<concise result>`     |
| local | `npm run validate`                                   | `<status>` | `<concise result>`     |

## Evidence limits

- Hosted CI: `<status, run link, and exact candidate>`
- Publication or installation: not implied by this PR.
- Deployment or production: not in scope.

## Review checklist

- [ ] Requirements are generic, readable, self-contained, and independently reviewable.
- [ ] Long contains one canonical decision.
- [ ] Short is compact and does not change Long.
- [ ] Guide is non-normative and current-source claims are dated.
- [ ] Both ADR namespaces use independent live IDs.
- [ ] Conflicts are explicit and accepted history is preserved.
- [ ] Every unresolved review decision names its owner.
- [ ] Architecture Compass validator inventory, lineage, and lock are synchronized.
- [ ] Skill, repository, changelog, and applicable plugin release versions are coherent.
- [ ] Generated plugin files came from the owning sync command.
- [ ] The worktree is clean and validation evidence names the exact candidate commit, stage, status, and gaps.
