# ADR-0021: Place portable skills in workflow categories

ID: ADR-0021
Title: Place portable skills in workflow categories
Status: Accepted
Date: 2026-07-06
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: catalog, portability, categories
Applies when: Choosing the public catalog category or runtime specialization for a skill.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Portable skills belong in workflow categories, not runtime operation categories.

Variants: **Short** · [Long, canonical](0021-place-portable-skills-in-workflow-categories.long.md) · [Guide](0021-place-portable-skills-in-workflow-categories.guide.md)

## Decision

We will place public skills by durable workflow scope and reserve runtime operation categories for independent skills whose target-specific name, configuration, evidence, or output makes both their trigger and outcome materially distinct.

## Context

- `codegraph-ast-grep` uses the same exploration workflow in Codex and Cursor; duplicate variants would drift.
- Spec interviewers differ by runtime name, evidence, and execution prompt.

## Consequences

- Good: Catalog placement reflects actual behavior.
- Tradeoff: Install docs must name portable skills per runtime.
- Risk: Future Cursor or Claude setup differences may require a new runtime variant.
