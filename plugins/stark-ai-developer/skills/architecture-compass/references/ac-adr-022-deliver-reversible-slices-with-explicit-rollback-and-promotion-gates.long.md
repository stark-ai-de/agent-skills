# AC-ADR-022: Deliver Reversible Slices With Explicit Rollback and Promotion Gates

ID: AC-ADR-022
Title: Deliver Reversible Slices With Explicit Rollback and Promotion Gates
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: delivery, rollback, promotion, evidence
Applies when: Work spans phases, deployment artifacts, release boundaries, irreversible operations, or multiple environments.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Deliver bounded slices whose targets, proof, stop conditions, promotion, and rollback are explicit before execution.

Variants: [Short](ac-adr-022-deliver-reversible-slices-with-explicit-rollback-and-promotion-gates.short.md) · **Long, canonical** · [Guide](ac-adr-022-deliver-reversible-slices-with-explicit-rollback-and-promotion-gates.guide.md)

## Context

Large changes become risky when planning, code mutation, artifact publication, deployment, activation, migration, and external coordination are treated as one implicit action. A green local or CI result can be mistaken for a published or deployed outcome, while an undefined rollback plan becomes unusable precisely when pressure is highest.

## Decision

Delivery is divided into bounded, independently reviewable slices with explicit authorization, evidence, promotion, stop, and rollback contracts.

### Slice contract

Before execution, each slice records:

- its exact file, component, service, resource, tenant, environment, or artifact allowlist;
- the verified input revision and relevant runtime or ownership state;
- the intended mutation and responsible owner;
- acceptance scenarios and the evidence stage they prove;
- stop conditions and escalation owner;
- rollback or forward-recovery procedure, last reversible point, and data implications;
- dependencies and the separate authorization required for any later slice.

Scope drift, ownership drift, stale inventory, unexpected dirty state, or a failed stop threshold invalidates the checkpoint. Reconcile the current state and obtain fresh authorization rather than expanding the slice implicitly.

### Promotion

- Build once where the delivery system supports it and promote an immutable, identifiable artifact instead of rebuilding untraceable variants per environment.
- Keep code deployment, feature exposure, data migration, publication, and external activation separable when doing so materially reduces risk.
- Define the gate for each environment or audience, including current test results, compatibility state, migration readiness, observability, rollback readiness, and approver.
- Use a canary, cohort, feature flag, traffic shift, or bounded target set when it offers meaningful detection and reversal. A flag has an owner, safe default, cleanup condition, and behavior for both states.
- Completing a phase or passing its checks does not authorize the next phase. Promotion is an explicit action against an exact artifact and target.

### Rollback and irreversible operations

Rollback is executable within the required time and accounts for schema, event, cache, queue, and externally visible effects. Test or rehearse the path in proportion to impact. If old code cannot read new state, deployment rollback alone is not a valid plan.

Destructive migration, credential revocation, irreversible publication, deletion, permanent traffic transition, and other one-way actions are isolated behind explicit approval. Confirm exact targets, recovery evidence, last reversible point, and stop thresholds immediately before execution.

### Evidence and claims

Track `source/static`, `local`, `CI`, `publication/install`, `deployed/production`, and `external/third-party` evidence separately. Include command or scenario, artifact identity, target, time, result, and limitation. A local or CI pass does not prove publication or deployment; a healthy deployment does not prove the feature is active for intended users or that a third-party boundary succeeded.

## Failure handling

On a stop condition, halt further promotion, preserve relevant evidence, and execute the approved rollback or forward-recovery path for the affected target. Do not widen traffic, retry irreversible work, or change the target set without a new checkpoint. Report partial state precisely.

## Acceptance criteria

- Every slice has an allowlist, input state, owner, proof, stop conditions, and rollback contract.
- Promotion uses identifiable artifacts and separate environment or audience gates.
- Reversible rollout is separated from irreversible work and later phases require distinct authorization.
- Rollback accounts for data and protocol compatibility and is rehearsed proportionately.
- Completion claims name the exact evidence stage and do not infer later stages.

## Consequences

Delivery requires more explicit checkpoints and may defer broad rollout. It reduces blast radius, makes authorization auditable, and provides actionable control when evidence or runtime state changes.
