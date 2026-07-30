# Ambiguous Start Selection

## Should Trigger

Yes.

## Prompt

Use the Cursor Memory Curator for this repository.

## Deterministic Assertions

- contains: plan-run-cleanup-file
- contains: review-chat
- contains: review-file
- contains: cleanup-chat
- contains: cleanup-file
- contains: plan-cleanup-chat
- contains: plan-cleanup-file
- contains: plan-run-cleanup-chat
- contains: Recommended
- contains: write scope
- contains: choose
- not_contains: inventory complete

## Expected Behavior

Show all eight workflows in canonical order, with `plan-run-cleanup-file` first and Recommended. Because the request does not identify review versus cleanup or delivery, ask the user to choose without inventorying, scanning, or reading Cursor context.
