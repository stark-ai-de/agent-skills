# ADR Writer Example

Prompt:

```text
Use $adr-writer to record that this repo keeps public skills promoted-only.
```

Expected ADR shape:

```md
# 0004 Keep Public Skills Promoted Only

Status: Accepted

## Context

Anything under `skills/` can be installed into an agent runtime.

## Decision

Keep `skills/` limited to promoted public skills. Track candidate public skills in `incubator/skills/`.

## Consequences

The public catalog stays safer to install, but draft workflows need another review path before publication.
```
