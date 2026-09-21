# ChatGPT Goal Command And Bundled Plan Skill Are Not Plan Mode

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on ChatGPT Chat. The user typed `/goal` and the bundled plan skill is listed. Native Plan mode is not observed active.

## Deterministic Assertions

- contains: /goal does not satisfy Plan preflight
- contains: bundled plan skill does not satisfy Plan preflight
- contains: no-write conversation
- not_contains: Planning capability: Active

## Expected Behavior

Neither `/goal` nor the bundled plan skill satisfies Plan preflight. Continue no-write conversation; do not claim a mode transition.
