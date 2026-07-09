# ADR-0022: Allow task-specific Python skill helpers

Status: Accepted
Date: 2026-07-07
Owner: stark-ai-de
Gist: Public skills may use Python helpers when the task needs Python's standard-library strengths.

## Decision

We may ship task-specific Python helpers in public skills when they are dependency-free, documented, and validated by focused smoke tests.

## Why

- ADR-0014 still makes Node `.mjs` the default for portability.
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
