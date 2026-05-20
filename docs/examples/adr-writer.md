# ADR Writer Example

Prompt:

```text
Use $adr-writer to record that this repo keeps public skills stable-only.
```

Expected ADR shape:

```md
# 0004 Keep Public Skills Stable Only

Status: Accepted

## Context

Anything under `skills/` can be installed into an agent runtime.

## Decision

Keep `skills/` limited to stable public skills. Track experiments in specs, issues, or ignored project-local folders.

## Consequences

The public catalog stays safer to install, but draft workflows need another review path before publication.
```
