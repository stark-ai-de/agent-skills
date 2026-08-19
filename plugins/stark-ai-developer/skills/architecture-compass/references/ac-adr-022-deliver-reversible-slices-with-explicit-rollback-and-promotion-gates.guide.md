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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Deliver bounded slices whose targets, proof, stop conditions, promotion, and rollback are explicit before execution.

Variants: [Short](ac-adr-022-deliver-reversible-slices-with-explicit-rollback-and-promotion-gates.short.md) · [Long, canonical](ac-adr-022-deliver-reversible-slices-with-explicit-rollback-and-promotion-gates.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Slice template

```text
Slice and owner:
Exact allowlist:
Verified input revision/state:
Mutation:
Acceptance scenarios:
Evidence stage produced:
Stop conditions:
Last reversible point:
Rollback or forward recovery:
Data/protocol compatibility:
Next phase and separate approver:
```

Prefer a slice that can be reviewed and validated without activating it broadly: introduce compatible code, validate the inactive path, publish or deploy an identifiable artifact, expose it to a bounded cohort, observe declared indicators, and only then consider wider promotion. Skip stages that add no safety, but state why they are not applicable.

## Promotion evidence table

| Stage                | Typical proof                                         | Does not prove                                |
| -------------------- | ----------------------------------------------------- | --------------------------------------------- |
| Source/static        | Diff, policy, manifest, dependency graph              | Runtime behavior                              |
| Local                | Focused commands and scenarios on a named revision    | CI or published artifact                      |
| CI                   | Hosted checks for a named revision/artifact           | Publication or deployment                     |
| Publication/install  | Registry or installation inspection                   | Production activation                         |
| Deployed/production  | Target revision, health, traffic, and behavior        | External provider completion unless exercised |
| External/third-party | Direct response, state, or receipt from that boundary | Other environments or later time              |

## Rollback rehearsal

- Trigger rollback in a safe environment or dry-run mechanism.
- Verify artifact availability, permissions, commands, ownership, and expected duration.
- Exercise both code and data compatibility, including messages written during the canary window.
- Confirm flags and traffic controls fail to the safe state.
- Record what cannot be reversed and move it behind a separate approval gate.

## Official sources

- [Kubernetes Deployments and rollback](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Argo Rollouts concepts](https://argo-rollouts.readthedocs.io/en/stable/concepts/)
- [OpenFeature specification](https://openfeature.dev/specification/)
- [Google SRE: release engineering](https://sre.google/sre-book/release-engineering/)
