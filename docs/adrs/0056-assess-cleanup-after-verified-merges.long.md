# ADR-0056: Assess cleanup after verified merges

ID: ADR-0056
Title: Assess cleanup after verified merges
Status: Proposed
Date: 2026-09-24
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: merge, cleanup, tests, lifecycle, architecture-compass
Applies when: An agent observes a verified merge during repository work.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-24
Gist: Assess cleanup after verified merges and promote the policy through Architecture Compass after acceptance.

Variants: [Short](0056-assess-cleanup-after-verified-merges.short.md) · **Long, canonical** · [Guide](0056-assess-cleanup-after-verified-merges.guide.md)

## Decision

Chosen proposal: require a bounded cleanup assessment when an agent observes a verified merge during repository work, and later expose that policy through Architecture Compass.

- Verify the repository, merged change and target state; examine the integrated change and its directly affected consumers against the current target state.
- Judge candidates by their remaining purpose, users and protection obligations. A merge does not prove deployment, completed migration or expiry of rollback support; missing references or CI usage alone do not prove obsolescence.
- Classify relevant findings as remove, retain, defer or unresolved. Removal requires evidence that the purpose has ended or necessary protection is preserved elsewhere. Deferred findings name an owner and the evidence or event needed for reassessment.
- Assessment does not expand authority. Reuse existing authorization for bounded changes; protect concurrent work and honor separate publication, deployment and destructive-action boundaries.
- Reuse existing assessments and follow-ups while their relevant evidence remains valid. A short no-finding statement is sufficient; do not require a new file, test, issue or pull request for every merge.
- Promote this proposal only through separately accepted provider governance, release and repository-native adoption. It does not install a merge watcher or make every repository automatically governed.

## Why

A pre-merge review evaluates a candidate while old and new paths may still coexist. After integration, new evidence can establish that temporary validation, migration code, compatibility paths or documentation have completed their purpose. Relying on another user request leaves this useful follow-up to chance.

The proposal adds an observation-triggered lifecycle check. It does not replace existing rules for temporary migrations, behavioral test ownership, evidence reuse or safe execution. An assessment may correctly find nothing to remove, preserve an inactive adapter's tests, or defer a deletion until consumers have moved and rollback no longer depends on the old path.

The merged subject and the state being assessed are distinct. Subsequent changes or a revert can invalidate a previous finding. Squash and rebase integrations may not preserve source-branch ancestry, so verification needs the repository's authoritative merge mapping rather than a universal ancestry shortcut.

Reference searches are evidence inputs, not a complete liveness proof. CI configuration, package exports, dynamic registration, manual operating procedures, shared consumers and external contracts can keep apparently unused files relevant. A failing, old or expensive test may still protect a current requirement; deleting it solely to make checks pass would not satisfy this proposal.

## Options

- Chosen: assess the relevant scope after a verified merge is observed, using existing task and review surfaces for the outcome. This closes the lifecycle gap without requiring new runtime machinery.
- Rejected: rely exclusively on the original pre-merge review. Some removal conditions cannot be established until later integration or rollout evidence exists.
- Rejected: require deletion or a cleanup PR after every merge. A no-finding or retain result can be correct, and useful tests must not be traded for an arbitrary reduction target.
- Rejected: scan every repository or introduce a persistent merge watcher as part of this decision. Those have separate scope, access, scheduling and delivery requirements.
- Rejected: decide by filename, age, lack of CI execution, absence of a static reference or similarity to another test. These signals do not establish that the underlying contract or evidence obligation has disappeared.

## Consequences

- Good: the original request becomes a repeatable agent behavior instead of depending on a second cleanup prompt.
- Good: relevant safety, regression, compatibility and replay protection remain explicit preservation criteria.
- Good: deferred transition cleanup can be revisited when its named condition changes, while repeated notifications of the same merge reuse existing work.
- Tradeoff: some conclusions require evidence outside the diff. Unavailable evidence yields a scoped unresolved or deferred result, not a claim that the whole repository is clean.
- Tradeoff: an instruction-following agent must observe the merge and load the local rule. Installing Architecture Compass alone cannot guarantee unattended execution or host compliance.
- Risk: repeating broad scans or manufacturing durable reports after trivial changes could cost more than the cleanup saves. Bound the assessment to impact and reuse existing reporting surfaces.

## Follow-up

This is a repository-local Proposed decision about a future Compass capability. Its `Adoptable: false` metadata is required by the repository ADR contract; it does not preclude a later, separately accepted public provider decision with `Scope: target-repository` and `Adoptable: true`.

The [proposal specification](../specs/architecture-compass-post-merge-cleanup-spec.md) preserves the original idea, source challenge, rollout stages and acceptance scenarios. The [Guide](0056-assess-cleanup-after-verified-merges.guide.md) describes the intended application and verification path without activating it.

Before implementation, accept or revise this proposal, resolve the provider identity and lineage, and qualify the new observed-merge behavior. Until then, do not change active `AGENTS.md` instructions, the shipped Compass catalog, generated projections or release metadata to enforce it.
