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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-24
Gist: Assess cleanup after verified merges and promote the policy through Architecture Compass after acceptance.

Variants: **Short** · [Long, canonical](0056-assess-cleanup-after-verified-merges.long.md) · [Guide](0056-assess-cleanup-after-verified-merges.guide.md)

## Decision

Chosen proposal: require a bounded cleanup assessment when an agent observes a verified merge during repository work, and later expose that policy through Architecture Compass.

- Verify the repository, merged change and target state; examine the integrated change and its directly affected consumers against the current target state.
- Judge candidates by their remaining purpose, users and protection obligations. A merge does not prove deployment, completed migration or expiry of rollback support; missing references or CI usage alone do not prove obsolescence.
- Classify relevant findings as remove, retain, defer or unresolved. Removal requires evidence that the purpose has ended or necessary protection is preserved elsewhere. Deferred findings name an owner and the evidence or event needed for reassessment.
- Assessment does not expand authority. Reuse existing authorization for bounded changes; protect concurrent work and honor separate publication, deployment and destructive-action boundaries.
- Reuse existing assessments and follow-ups while their relevant evidence remains valid. A short no-finding statement is sufficient; do not require a new file, test, issue or pull request for every merge.
- Promote this proposal only through separately accepted provider governance, release and repository-native adoption. It does not install a merge watcher or make every repository automatically governed.

## Context

Cleanup can become safe only after a change is integrated and its transition completes. A deliberate post-merge check can find obsolete tests, temporary code and stale operational instructions that the original review did not remove. Existing lifecycle and validation policies decide what is safe to remove; this proposal supplies the recurring assessment trigger.

This record is Proposed. The current PR records the idea and its evaluation; it does not activate a new skill or target-repository rule.

## Consequences

- Good: completed transitions receive an explicit, relevant-scope cleanup check.
- Tradeoff: small read-only assessment work is added to observed merge completion.
- Risk: treating merge or low test activity as deletion proof could remove necessary protection; explicit evidence and defer/retain outcomes prevent that shortcut.
