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
2. Use the repo ADR template and word limit.
3. Mark status as `Proposed` unless the maintainer explicitly accepts it.
4. Reference the ADR from the implementation spec.
5. Persist the ADR when required, report its path, and update the repo ADR index when one exists.
6. If the spec depends on ADR acceptance, mark implementation as blocked or phased.

## Spec Linkage

The final spec should include an `Architectural decisions` section:

- `ADR required: no` for feature-only work.
- `ADR draft: <title>` when the decision is proposed but not saved.
- `ADR path: docs/adr/NNNN-title.md` when the ADR exists.
- `Implements: ADR-XXXX` when the spec implements an accepted decision.

Do not re-litigate accepted ADRs during implementation unless repo reality or current sources contradict them.
