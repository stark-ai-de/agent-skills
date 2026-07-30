# ADR-0014: Prefer Node skill helper scripts

ID: ADR-0014
Title: Prefer Node skill helper scripts
Status: Accepted
Date: 2026-05-24
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: node, scripts, portability
Applies when: Adding a helper script to a public skill.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Public skill helpers should be portable across common developer operating systems.

Variants: [Short](0014-prefer-node-skill-helper-scripts.short.md) · **Long, canonical** · [Guide](0014-prefer-node-skill-helper-scripts.guide.md)

## Decision

We will prefer dependency-free `.mjs` helper scripts for public skills when the task can be implemented with Node.js standard library APIs.

## Why

- Public skills may be installed on macOS, Linux, Windows, WSL, and CI runners.
- Shell helpers often depend on Bash and POSIX tools that are not reliably available on Windows.
- This repository already requires Node and validates plain ESM scripts.

## Options

- Chosen: Node `.mjs` helpers for portable public skill scripts.
- Rejected: Bash as the default, because it narrows Windows compatibility.
- Rejected: TypeScript helpers, because they add runtime or build-step complexity.

## Consequences

- Good: Installed public skills need fewer platform-specific assumptions.
- Tradeoff: Small scripts become a little more verbose.
- Risk: Node version drift can affect helpers if they use new APIs.

## Follow-up

- Validate skill-local `.mjs` scripts with the repo script validation gate.
