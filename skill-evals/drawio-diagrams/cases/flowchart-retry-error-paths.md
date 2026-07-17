# Retry And Error Handling Flowchart

## Prompt

```text
Create an editable diagrams.net flowchart for document ingestion with validation, duplicate detection, retry, dead-letter handling, manual review, and successful completion.
```

## Should Trigger

Yes

## Expected Behavior

- Use process, decision, start/end, and data shapes according to their semantics.
- Label every decision branch and keep the retry loop visually unambiguous.
- Animate directed process flows by default while keeping notes and annotations static.
- Make success, manual-review, and dead-letter outcomes independently visible.

## Deterministic Assertions

- contains: decision
- contains: retry
- regex: dead-letter|dead letter
- contains: flowAnimation=1
