---
name: repo-map-zoom-out
description: Map unfamiliar code areas before implementation by identifying entry points, ownership boundaries, callers, data flow, ADRs, validation, and likely edit surfaces. Use when the user asks to understand a subsystem, zoom out, map a repo area, or prepare for a risky change.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  internal: true
  version: "0.1.0"
---

# Repo Map Zoom Out

## Goal

Build a compact map of an unfamiliar code area so implementation starts with the right boundaries, dependencies, and validation path.

## When to use

- The user asks to understand a subsystem, route, package, workflow, or architecture boundary.
- A change looks risky because callers, data flow, or ownership are unclear.
- An agent needs context before editing but should avoid broad file dumping.

## When not to use

- The user needs a direct code fix and the relevant files are already known.
- The task is a full repo audit; use `repo-health-audit`.
- The user wants an ADR; use `adr-writer` after the decision is clear.

## Inputs to inspect

- Repo tree, package files, routing files, tests, ADRs, domain docs, and validation docs.
- Existing code search results for entry points, callers, imports, and tests.
- CodeGraph or ast-grep outputs when available, but do not require them.

## Workflow

1. Define the target area and the question the map must answer.
2. Identify entry points, exported APIs, routes, commands, jobs, or event handlers.
3. Trace likely callers, callees, imports, data models, and side effects.
4. Locate tests, fixtures, validation commands, docs, and relevant ADRs.
5. Produce a compact map with likely edit surfaces and risk points.
6. Recommend next implementation or investigation steps.

## Safety rules

- Do not read broad files just to fill space; prefer targeted search and source ranges.
- Do not treat naming similarity as proof of ownership.
- Do not propose edits until the map identifies the likely affected surface.
- Do not claim complete coverage when only a subset was inspected.

## References

No bundled references. If `codegraph-ast-grep` is available and the repo is indexed, it can help with symbol lookup and structural search. Local ADRs and domain docs should be inspected when relevant.

## Scripts

No bundled scripts.

## Output format

Return:

1. Target question
2. Entry points
3. Main data or call flow
4. Ownership boundaries
5. Tests and validation
6. Relevant docs or ADRs
7. Likely edit surfaces
8. Risks and unknowns

## Completion criteria

- The map is specific enough to guide implementation.
- Relevant tests and validation are identified.
- Unknowns are explicit.
- The next step is clear.

## Failure modes

- If the target area is too broad, ask for a narrower subsystem or user workflow.
- If code search is inconclusive, list the searched terms and fallback path.
- If docs and code disagree, prioritize code behavior and note the docs drift.
