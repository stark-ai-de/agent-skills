# ChatGPT Mobile Incomplete Record Stays Indeterminate

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on ChatGPT mobile. `plan_control` is not observed. The user has not enumerated controls or declined Plan.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: ask whether Plan is available
- contains: wait for confirmed Plan mode
- not_contains: Planning capability: Unavailable
- not_contains: portable in-chat planning fallback

## Expected Behavior

Mobile stays in the ChatGPT lane. An incomplete record is Indeterminate: ask and wait, do not fall back.
