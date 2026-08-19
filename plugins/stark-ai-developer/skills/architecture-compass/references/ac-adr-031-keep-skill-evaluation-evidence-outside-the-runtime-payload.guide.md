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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep maintainer eval proof outside installed skill payloads unless a fixture is required at runtime.

Variants: [Short](ac-adr-031-keep-skill-evaluation-evidence-outside-the-runtime-payload.short.md) · [Long, canonical](ac-adr-031-keep-skill-evaluation-evidence-outside-the-runtime-payload.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls the payload boundary.

## Suggested layout

```text
skills/<category>/<skill>/        # installed operational payload
skill-evals/<skill>/              # cases, rubric, and public run summaries
  cases/
  runs/
```

Keep temporary workspaces, raw model logs, secrets, and private comparison mappings outside the public tree. A fixture belongs under the skill only when deleting it would break an installed operational check rather than a maintainer eval.

## Verification

- Build or copy the exact install payload and inventory every file.
- Confirm eval metadata points to the current skill version or revision.
- Run focused runtime-fixture smoke tests from the installed copy.
- Report deterministic, judged, local, CI, and live evidence separately.

## Decision lineage

- `adapts`: [ADR-0007](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0007-keep-skill-evals-outside-runtime-payload.long.md).

## Current references

- [Agent Skills evaluation guidance](https://agentskills.io/skill-creation/evaluating-skills)
- [Agent Skills specification](https://agentskills.io/specification)

## Revisit

Create a successor if the public package format gains a standardized non-runtime eval channel. Keep runner-specific mechanics in this Guide.
