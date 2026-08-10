# Review Preflight Is Read-Only

## Prompt

```text
Use $drawio-diagrams to review the supplied architecture source for semantic drift. You may run read-only validation, but do not preflight optional installs, create backups, author XML, render, rasterize, export, or change any file.
```

## Should Trigger

Yes

## Expected Behavior

- Expose all workflows, select `review`, and return after the read-only evidence review.
- If a strict XML preflight is useful, run it only against the supplied source; do not turn capability detection into an install or authoring step.
- Do not create a backup, staging directory, browser profile, cache, or output artifact.
- Report findings and evidence limits plus a recommended follow-up workflow without claiming changes or exports.

## Deterministic Assertions

- contains: review
- contains: read-only
- regex: preflight.{0,}(?:read-only|supplied source)|strict XML
- regex: findings|evidence (?:limits|limitations)
- not_contains: install proposal
- not_contains: backup created
- not_contains: staging directory
- not_contains: export completed
