# Architecture Change Needs ADR

## Should Trigger

Yes.

## Prompt

Move our background job processing from in-process timers to a queue-backed worker. Before implementation, write the spec and tell me if we need an ADR.

## Expected Behavior

- Classify this as architecture-affecting.
- Inspect existing ADRs, worker/runtime docs, package structure, deployment constraints, and validation commands when present.
- Run the ADR gate and mark ADR required unless repo evidence proves an accepted decision already covers the change.
- Produce or reference an ADR draft/path before the implementation spec proceeds.
- Include migration, rollback, and rollout considerations.
- Persist the proposed ADR under the repo ADR folder before or with the spec, link it from the spec, and update the existing ADR index when repository convention requires it.
- Mark implementation blocked until the proposed ADR is accepted when the queue-backed worker decision controls the implementation.
