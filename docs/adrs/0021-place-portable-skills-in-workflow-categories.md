# ADR-0021: Place portable skills in workflow categories

Status: Accepted
Date: 2026-07-06
Owner: stark-ai-de
Gist: Portable skills belong in workflow categories, not runtime operation categories.

## Decision

We will place public skills by durable workflow scope and reserve runtime operation categories for independent skills whose target-specific name, configuration, evidence, or output makes both their trigger and outcome materially distinct.

## Why

- `codegraph-ast-grep` uses the same exploration workflow in Codex and Cursor; duplicate variants would drift.
- Spec interviewers differ by runtime name, evidence, and execution prompt.
- Memory curators may differ by agent because durable memory state is runtime-specific.

## Options

- Chosen: move portable skills into workflow categories.
- Rejected: duplicate portable skills per runtime, because maintenance cost exceeds value.
- Rejected: keep portable skills under the first runtime category, because discovery becomes misleading.

## Consequences

- Good: Catalog placement reflects actual behavior.
- Tradeoff: Install docs must name portable skills per runtime.
- Risk: Future Cursor or Claude setup differences may require a new runtime variant.

## Follow-up

- Move `codegraph-ast-grep` to Engineering Workflows and keep spec interviewers runtime-specific.
