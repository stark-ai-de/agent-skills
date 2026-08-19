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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Prefer portable standard-library helpers and justify every runtime or dependency.

Variants: **Short** · [Long, canonical](ac-adr-033-choose-portable-dependency-light-skill-helpers.long.md) · [Guide](ac-adr-033-choose-portable-dependency-light-skill-helpers.guide.md)

## Decision summary

Public skill helpers use the smallest portable runtime contract that fits the task. Dependency-free Node.js ESM is the default for cross-platform filesystem, process, JSON, and text work; dependency-free Python is an allowed task-specific exception when its standard library materially improves clarity or correctness. Shell and third-party dependencies require explicit target evidence, documented prerequisites, safe failure behavior, and focused installed-payload smoke tests.

## Context

Helpers can make skill behavior deterministic, but runtime and package assumptions reduce install portability and expand the supply-chain boundary.

## Invariants

- Helper prerequisites and side effects are documented.
- Missing optional runtimes fail safely or expose a bounded degraded path.
- Tests execute helpers from the installed payload on claimed platforms.

## Consequences

Most users need no helper dependency install, while maintainers sometimes accept a more verbose implementation or a documented optional runtime.
