# ADR-0007: Keep skill evals outside runtime payload

ID: ADR-0007
Title: Keep skill evals outside runtime payload
Status: Accepted
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: evals, runtime-payload, evidence
Applies when: Adding evaluation cases, run evidence, or runtime self-test fixtures.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Treat skill evals as maintainer proof, not default runtime content.

Variants: **Short** · [Long, canonical](0007-keep-skill-evals-outside-runtime-payload.long.md) · [Guide](0007-keep-skill-evals-outside-runtime-payload.guide.md)

## Decision

We will store skill evaluation cases and run evidence in `skill-evals/` outside `skills/` by default, only bundling self-test fixtures inside a skill when that skill needs them at runtime.

## Context

- Installed agents need operational instructions, templates, assets, and scripts.
- Eval prompts, rubrics, transcripts, and run evidence can pollute context.

## Consequences

- Good: Skills stay smaller and cleaner to install.
- Tradeoff: Eval tooling must map evidence back to skill names.
- Risk: External evals can drift from skill contents if not validated.
