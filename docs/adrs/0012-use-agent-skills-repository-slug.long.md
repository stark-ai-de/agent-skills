# ADR-0012: Use agent-skills repository slug

ID: ADR-0012
Title: Use agent-skills repository slug
Status: Accepted
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: repository, naming, github
Applies when: Naming or referencing the public repository.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: The public repository slug should match ecosystem Agent Skills naming.

Variants: [Short](0012-use-agent-skills-repository-slug.short.md) · **Long, canonical** · [Guide](0012-use-agent-skills-repository-slug.guide.md)

## Decision

We will use `stark-ai-de/agent-skills` as the public repository slug.

## Why

- It names the repo by the artifact it publishes.
- It aligns with common ecosystem examples like `vercel-labs/agent-skills`.
- It is clearer than `skills`, which is too generic outside local context.

## Options

- Chosen: `agent-skills`.
- Rejected: `skills`, because it is shorter but ambiguous.
- Rejected: `stark-ai-agent-skills`, because the owner already provides the brand context.

## Consequences

- Good: Install commands and listings communicate the repo purpose immediately.
- Tradeoff: Existing docs and release output need one more alignment pass.
- Risk: Old GitHub URLs depend on repository redirects.

## Follow-up

- Update repository metadata, docs, and local remotes.
