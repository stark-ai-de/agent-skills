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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Deliver bounded slices whose targets, proof, stop conditions, promotion, and rollback are explicit before execution.

Variants: **Short** · [Long, canonical](ac-adr-022-deliver-reversible-slices-with-explicit-rollback-and-promotion-gates.long.md) · [Guide](ac-adr-022-deliver-reversible-slices-with-explicit-rollback-and-promotion-gates.guide.md)

## Decision summary

Each delivery slice has a precise allowlist, verified input state, owner, acceptance proof, stop condition, rollback path, and last reversible point. Completing one slice or environment does not authorize or prove the next. Promotion uses the same identifiable artifact and occurs only after its gate has current evidence.

Irreversible work is separated from reversible rollout and receives explicit approval. Local success never establishes CI, publication, installation, deployment, production behavior, or external integration; each stage is verified and reported independently.

## Read next

Read the [Long variant](ac-adr-022-deliver-reversible-slices-with-explicit-rollback-and-promotion-gates.long.md) before dividing work into phases or authorizing promotion. Load the [Guide](ac-adr-022-deliver-reversible-slices-with-explicit-rollback-and-promotion-gates.guide.md) for phase and evidence templates, staged rollout options, and rollback rehearsal prompts.
