# ADR-0022: Allow task-specific Python skill helpers

ID: ADR-0022
Title: Allow task-specific Python skill helpers
Status: Accepted
Date: 2026-07-07
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: python, scripts, portability
Applies when: Proposing a Python helper inside a public skill.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Public skills may use Python helpers when the task needs Python's standard-library strengths.

Variants: [Short](0022-allow-task-specific-python-skill-helpers.short.md) · **Long, canonical** · [Guide](0022-allow-task-specific-python-skill-helpers.guide.md)

## Decision

We may ship task-specific Python helpers in public skills when they are dependency-free, documented, and validated by focused smoke tests.

## Why

- [ADR-0014](0014-prefer-node-skill-helper-scripts.short.md) ([Long, canonical](0014-prefer-node-skill-helper-scripts.long.md) · [Guide](0014-prefer-node-skill-helper-scripts.guide.md)) still makes Node `.mjs` the default for portability.
- Some helper tasks, such as XML validation with recursive parsing and contrast checks, are clearer and safer in Python's standard library.
- Runtime skills can detect `python3` and report degraded validation when it is unavailable.

## Options

- Chosen: allow dependency-free Python helpers by exception.
- Rejected: require a Node port before every public promotion, because it can delay useful deterministic validation.
- Rejected: allow arbitrary Python dependencies, because public installs should stay portable.

## Consequences

- Good: complex validators can stay deterministic without package installs.
- Tradeoff: repo validation must include focused Python smoke coverage.
- Risk: users without Python get a documented degraded path.
