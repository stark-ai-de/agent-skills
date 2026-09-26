# ChatGPT Product-Label-Only Detection

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on a host whose only Plan evidence is the product label "ChatGPT". No Plan control, Plan state, or slash menu is visible.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- not_contains: Planning capability: Unavailable

- contains: no-write conversation
- contains: unknown state never authorizes writes

## Expected Behavior

Report the uncertain capability without inventing a control, mode transition, or positive absence. Continue permitted no-write conversation and proven non-mutating discovery. Unknown state never authorizes writes; obtain only the missing state needed for a requested transition or a later write. Product identity, missing slash commands, documentation alone, and a busy menu are not live control evidence.
