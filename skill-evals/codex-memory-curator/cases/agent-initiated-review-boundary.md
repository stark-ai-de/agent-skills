# Agent-Initiated Review Boundary

## Should Trigger

Yes.

## Prompt

While maintaining this repository, you notice Codex memory may conflict with current package scripts. Use the curator as needed; I did not request cleanup or a persisted report.

## Deterministic Assertions

- contains: review-chat
- contains: Selected
- contains: read-only
- not_contains: cleanup-file selected
- not_contains: files changed

## Expected Behavior

Expose all eight workflows, announce `review-chat` because activation is agent-initiated and neither cleanup nor persistence was requested, perform the full review, and create no report or backup.
