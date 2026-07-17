# Architecture Review Text Only Negative

## Prompt

```text
Review this architecture decision record and give me a concise text-only critique of its tradeoffs. Do not create or edit a diagram.
```

## Should Trigger

No

## Expected Behavior

- Do not activate for a text-only architecture review with an explicit no-diagram instruction.
- Analyze the decision, evidence, and tradeoffs in prose.
- Do not create draw.io files or introduce diagram validation and rendering steps.

## Deterministic Assertions

- regex: tradeoff|architecture decision|ADR
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
