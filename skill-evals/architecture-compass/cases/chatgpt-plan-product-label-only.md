# ChatGPT Product-Label-Only Detection

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on a host whose only Plan evidence is the product label "ChatGPT". No Plan control, Plan state, or slash menu is visible.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: ask whether Plan is available
- contains: wait for confirmed Plan mode
- not_contains: Planning capability: Unavailable
- not_contains: portable in-chat planning fallback

## Expected Behavior

Product identity alone does not prove Plan is absent. Ask how to enter Plan and wait.
