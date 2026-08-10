# Semantic Status Marker Receipts

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to close out a completed setup. Tool readiness and the
bounded semantic and structural checks are verified. No extra configuration was
needed. Application tests were intentionally not run because application code
and dependencies did not change. CI was outside the authorized scope. Present a
concise, engaging, evidence-accurate receipt.

## Deterministic Assertions

- contains: ✅
- contains: ℹ️
- contains: ⏭️
- contains: ⚠️
- contains: verified
- contains: not run
- contains: CI
- not_contains: ✅ Application tests were not run
- not_contains: CI: verified

## Expected Behavior

- Use `✅` only for currently verified checks or completed authorized work at
  the stated evidence stages.
- Use `ℹ️` for the evidence-backed fact that additional configuration was not
  needed.
- Use `⏭️` for the intentionally not-run application tests and state why.
- Use `⚠️` for the missing CI evidence and keep the resulting limitation
  explicit.
- Keep exact textual statuses and reasons so the receipt remains meaningful
  without emoji rendering.
