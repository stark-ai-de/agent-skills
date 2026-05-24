---
title: "<short human-readable title>"
slug: "<kebab-case-slug>"
mode: "standard"
status: "draft"
owner: "<person-or-team>"
repo: "<repo-name-or-path>"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
source_request: "<original request>"
---

# <title>

## Goal

<clear problem statement, intended outcome, and why this work matters>

## Scope

### In scope

- <bounded work item>
- <bounded work item>

### Non-goals

- <explicit exclusion>
- <explicit exclusion>

## Repo context

- Relevant files/directories:
- Existing abstractions/patterns to preserve:
- Commands and toolchain:
- Related issue/ADR/PR:
- Unspecified facts:

## User-facing behavior

- User story:
- Primary flow:
- Failure/empty/loading states:
- Accessibility/localization/compatibility notes:

## Requirements

### Functional requirements

- WHEN <condition/event>, THE SYSTEM SHALL <expected behavior>.
- WHEN <condition/event>, THE SYSTEM SHALL <expected behavior>.
- IF <error/unwanted behavior>, THEN THE SYSTEM SHALL <expected behavior>.

### Non-functional requirements

- Performance:
- Reliability:
- Security/privacy:
- Observability/logging:

## Design notes

- Preferred implementation approach:
- Reuse before rewrite:
- Data/API/model changes:
- Tradeoffs considered:
- Follow existing repo conventions unless the spec says otherwise.

## Architectural decisions

- ADR required: yes/no/unresolved
- Existing ADRs consulted:
- ADR draft or path:
- Supersedes:
- Implementation blocked until ADR accepted: yes/no

## File plan

### Expected touched areas

- `path/to/file`
- `path/to/dir`

### Expected new files

- `path/to/new-file`

### Areas not to change

- `path/to/keep-stable`

## Execution plan

1. Confirm the current implementation and extension points.
2. Implement the minimal code changes for the happy path.
3. Add or update tests.
4. Handle error/edge states.
5. Run validation commands.
6. Review for regressions and scope creep.

## Source challenge

- Repo evidence checked:
- ADRs/specs checked:
- External docs checked:
- Requirements revised:
- Requirements preserved:
- Preceding ADR/spec work needed:
- ADR gate result:
- Skipped checks and why:

## Artifact plan

- Spec path:
- Destination basis: existing convention/suggested/user-provided/declined
- Explicit confirmation needed: yes/no
- Spec persistence: saved/declined/blocked
- Existing file overwrite needed: yes/no
- ADR paths:
- ADR persistence: none/saved/declined/blocked
- ADR index updates needed:

## Validation

```bash
<install-free verification commands>
<lint>
<typecheck>
<unit/integration tests>
```

### Manual checks

- Verify:
- Verify:
- Verify:

## Verification checkpoint

- Scope and non-goals confirmed: yes/no
- Assumptions reviewed:
- Non-blocking unknowns accepted: yes/no
- Blocking decisions:
- Risks and rollout reviewed: yes/no
- Validation plan reviewed: yes/no
- ADR result reviewed: yes/no
- Spec saved: yes/no
- ADR persistence needed: yes/no

## Risks and rollout

- Primary risk:
- Rollback path:
- Migration/backfill needs:
- Feature-flag or phased rollout need: yes/no

## Done when

- [ ] All functional requirements are met
- [ ] Non-goals remain untouched
- [ ] Validation commands pass
- [ ] Manual checks pass
- [ ] Risks and follow-up notes are documented

## Assumptions and open questions

- Assumption:
- Assumption:
- Open question:
