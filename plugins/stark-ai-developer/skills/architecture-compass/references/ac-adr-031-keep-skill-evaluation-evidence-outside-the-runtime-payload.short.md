# AC-ADR-031: Keep Skill Evaluation Evidence Outside the Runtime Payload

ID: AC-ADR-031
Title: Keep Skill Evaluation Evidence Outside the Runtime Payload
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: evals, runtime-payload, evidence, context
Applies when: Adding skill eval cases, rubrics, transcripts, run evidence, or runtime self-test fixtures.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep maintainer eval proof outside installed skill payloads unless a fixture is required at runtime.

Variants: **Short** · [Long, canonical](ac-adr-031-keep-skill-evaluation-evidence-outside-the-runtime-payload.long.md) · [Guide](ac-adr-031-keep-skill-evaluation-evidence-outside-the-runtime-payload.guide.md)

## Decision summary

Skill eval prompts, rubrics, comparisons, transcripts, and run evidence live in a maintainer-owned evaluation area outside the default installed skill payload. A skill bundles only focused fixtures that its operational runtime actually consumes, and those fixtures remain distinct from promotion or benchmark proof. Validation maps each external eval suite to the exact skill name and tested revision.

## Context

Evaluation evidence builds trust but can waste context, leak provenance, and drift when shipped as operational instructions.

## Invariants

- Installed payloads contain runtime needs, not default maintainer proof.
- Public evidence identifies the tested skill revision and limitations.
- Runtime self-tests are bounded and justified individually.

## Consequences

Skills install with less irrelevant context, while the repository must maintain explicit links and drift checks between packages and external evals.
