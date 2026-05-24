---
title: "<short human-readable title>"
slug: "<kebab-case-slug>"
artifact_path: "docs/specs/<kebab-case-slug>-spec.md"
mode: "deep"
status: "draft"
owner: "<person-or-team>"
repo: "<repo-name-or-path>"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
source_request: "<original request>"
phases: ["phase-1", "phase-2"]
---

# <title>

## Goal

<full objective, business or engineering motivation, and definition of success>

## Background

- Current problem:
- Why current behavior/architecture is insufficient:
- Related history, ADRs, or prior attempts:

## Scope

### In scope

- <major workstream>
- <major workstream>
- <major workstream>

### Non-goals

- <explicit exclusion>
- <explicit exclusion>
- <explicit exclusion>

## Repo context

- Relevant packages/services/modules:
- Current architecture and seams:
- Shared libraries/contracts that constrain the change:
- CI/build/test expectations:
- Unknowns or facts that require confirmation:

## Requirements

### Functional requirements

- WHEN <condition/event>, THE SYSTEM SHALL <expected behavior>.
- WHILE <state/precondition>, THE SYSTEM SHALL <expected behavior>.
- IF <error/unwanted behavior>, THEN THE SYSTEM SHALL <expected behavior>.

### Non-functional requirements

- Performance and scalability:
- Reliability and failure handling:
- Security/privacy/compliance:
- Observability and diagnostics:
- Backward compatibility:

## Design

### Proposed architecture

- Components involved:
- Control/data flow:
- Interfaces/contracts to create or modify:
- Storage/schema/config changes:
- Deprecation or migration strategy:

### Alternatives considered

- Option A:
- Option B:
- Chosen because:

## Architectural decisions

- ADR required: yes/no/unresolved
- Existing ADRs consulted:
- ADR draft or path:
- Supersedes:
- Implementation blocked until ADR accepted: yes/no

## Source challenge

- Repo evidence checked:
- ADRs/specs checked:
- External docs checked:
- Requirements revised:
- Requirements preserved:
- Preceding ADR/spec work needed:
- ADR gate result:
- Skipped checks and why:

## User verification

- Final checkpoint confirmed by:
- Confirmation date:
- Verified scope/non-goals:
- Verified rollout/rollback assumptions:
- Non-blocking open questions accepted:

## File and module plan

### Expected touched areas

- `path/to/package-a`
- `path/to/package-b`
- `path/to/shared-lib`

### Expected new files

- `path/to/new-file`

### Explicitly protected areas

- `path/to/avoid`

## Artifact plan

- Spec path:
- Destination basis: existing convention/suggested/user-provided/declined
- Explicit confirmation needed: yes/no
- Spec persistence: saved/declined/blocked
- Existing file overwrite needed: yes/no
- ADR paths:
- ADR persistence: none/saved/declined/blocked
- ADR index updates needed:
- Companion execution prompt path or embedding:

## Task breakdown

### Phase 1

- Task:
- Task:
- Validation gate:

### Phase 2

- Task:
- Task:
- Validation gate:

## Validation

```bash
<lint>
<typecheck>
<unit tests>
<integration tests>
<e2e tests>
<build command>
```

### Manual verification

- Scenario:
- Scenario:
- Scenario:

### Review focus

- Regression hotspots:
- Security review points:
- Migration sanity checks:

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

## Rollout and rollback

- Rollout strategy:
- Feature flag / canary / phased release:
- Data migration or backfill:
- Monitoring during rollout:
- Rollback trigger:
- Rollback procedure:

## Risks

| Risk   | Why it matters | Mitigation   |
| ------ | -------------- | ------------ |
| <risk> | <impact>       | <mitigation> |
| <risk> | <impact>       | <mitigation> |

## Done when

- [ ] Functional and non-functional requirements are met
- [ ] Planned phases are complete or explicitly deferred
- [ ] Validation commands pass
- [ ] Rollout notes are actionable
- [ ] Remaining open questions are documented

## Assumptions and open questions

- Assumption:
- Assumption:
- Open question:
- Open question:
