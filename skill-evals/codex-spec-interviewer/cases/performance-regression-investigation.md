# Performance Regression Investigation

## Should Trigger

Yes.

## Prompt

The list view became slow after the last release. Create a spec for investigating and fixing it without random rewrites.

## Deterministic Assertions

- contains: performance
- contains: measurement
- contains: validation
- contains: regression

## Expected Behavior

- Require measurement or profiling evidence before prescribing broad rewrites.
- Identify likely file areas from repo inspection.
- Include acceptance criteria for performance improvement and regression tests.
- Preserve non-goals for unrelated UI or data-model changes.
