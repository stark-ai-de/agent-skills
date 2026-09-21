# ADR Gate

Use this gate before finalizing the implementation spec. ADRs are for durable architecture and repo-level decisions, not feature notes.

## Create or Draft an ADR When

The spec depends on a new, changed, or superseded decision about:

- package, module, service, or ownership boundaries,
- dependency direction or shared abstraction policy,
- runtime, framework, storage, queue, or external service choice,
- public/shared API contracts,
- data ownership, schema, migration, or compatibility strategy,
- auth, security, permission, or privacy model,
- repo-wide validation, build, deployment, publishing, or release policy,
- replacing or superseding an existing ADR.

## Do Not Create an ADR For

- feature-specific behavior,
- UI copy, layout, or interaction details,
- one-off implementation choices under existing architecture,
- routine refactors that preserve current boundaries,
- test cases, validation commands, or rollout checklist items,
- temporary experiments or prototypes.

## Gate Output

Include this result before the final spec:

```md
## ADR gate

- ADR required: yes/no/unresolved
- Reason:
- Existing ADRs consulted:
- New ADR draft:
- Supersedes:
- Implementation blocked until ADR accepted: yes/no
```

## If ADR Is Required

1. Draft exactly one architectural decision per ADR.
2. Use the repository ADR template and required linked representations; do not impose a numeric word or section limit.
3. Mark status as `Proposed` unless the maintainer explicitly accepts the reviewed decision. Permission to save a proposed ADR is distinct from accepting its decision; preserve prior acceptance when unchanged.
4. Use the repo ADR filename pattern. If no pattern exists, use `NNNN-kebab-title.md` with the next sequential number.
5. Resolve missing ADR directories in the same concrete final checkpoint, reusing earlier directory-creation authority.
6. Persist the ADR when required and report its path. While the current execution host's Plan mode is active, defer this write to the save-only continuation. During persistence, update the repository's existing ADR index when its convention requires one; treat that minimal entry as part of ADR persistence, not unrelated documentation.
7. Reference the ADR from the implementation spec.
8. If the spec depends on ADR acceptance, mark implementation as blocked or phased.

## Spec Linkage

The final spec should include an `Architectural decisions` section:

- `ADR required: no` for feature-only work.
- `ADR draft: <title>` when the decision is proposed but not saved.
- `ADR path: docs/adrs/NNNN-title.md` when the ADR exists.
- `Implements: ADR-XXXX` when the spec implements an accepted decision.

Do not re-litigate accepted ADRs during implementation unless repo reality or current sources contradict them.
