# ADR-0007: Keep skill evals outside runtime payload

Status: Accepted  
Date: 2026-05-21  
Owner: stark-ai-de  
Gist: Treat skill evals as maintainer proof, not default runtime content.

## Decision

We will store skill evaluation cases and run evidence in `skill-evals/` outside `skills/` by default, only bundling self-test fixtures inside a skill when that skill needs them at runtime.

## Why

- Installed agents need operational instructions, templates, assets, and scripts.
- Eval prompts, rubrics, transcripts, and run evidence can pollute context.
- Repo owners should verify quality while users can inspect public proof.

## Options

- Chosen: public `skill-evals/` outside the installable skill payload.
- Rejected: per-skill `evals/` by default, because it ships proof with runtime content.
- Rejected: private evals only, because public trust signals matter.

## Consequences

- Good: Skills stay smaller and cleaner to install.
- Tradeoff: Eval tooling must map evidence back to skill names.
- Risk: External evals can drift from skill contents if not validated.

## Follow-up

- Define the `skill-evals/` layout before adding the first eval case.
