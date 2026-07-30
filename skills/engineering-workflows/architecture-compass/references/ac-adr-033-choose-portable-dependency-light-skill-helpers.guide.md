# AC-ADR-033: Choose Portable Dependency-Light Skill Helpers

ID: AC-ADR-033
Title: Choose Portable Dependency-Light Skill Helpers
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: helpers, nodejs, python, portability
Applies when: Adding or replacing an executable helper inside a public skill package.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Prefer portable standard-library helpers and justify every runtime or dependency.

Variants: [Short](ac-adr-033-choose-portable-dependency-light-skill-helpers.short.md) · [Long, canonical](ac-adr-033-choose-portable-dependency-light-skill-helpers.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls helper-runtime selection.

## Selection worksheet

| Question                                                               | Evidence |
| ---------------------------------------------------------------------- | -------- |
| Can instructions alone produce reliable behavior?                      |          |
| Which standard-library APIs fit the task?                              |          |
| Which claimed platforms have the runtime?                              |          |
| What does the helper read, write, execute, or access over the network? |          |
| What happens when the runtime or optional tool is absent?              |          |
| Which installed-copy fixtures prove the contract?                      |          |

Prefer `.mjs` for the Node default so module semantics are explicit. For a Python exception, use the standard library where feasible, detect `python3` or the repository's documented executable, and avoid import-time writes. In either runtime, resolve a trusted root once, reject path escape and unsafe symlinks, bound input and output sizes, write transactionally when replacing artifacts, and sanitize errors.

## Decision lineage

- `consolidates`: [ADR-0014](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0014-prefer-node-skill-helper-scripts.long.md), [ADR-0022](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0022-allow-task-specific-python-skill-helpers.long.md).

## Current references

- [Node.js ECMAScript modules](https://nodejs.org/api/esm.html)
- [Python standard library](https://docs.python.org/3/library/)
- [OWASP path traversal guidance](https://owasp.org/www-community/attacks/Path_Traversal)

## Revisit

Create a successor if public skill hosts standardize a different guaranteed helper runtime. Keep exact version support and platform commands in repository-local guidance.
