# Feature Flag Rollout

## Should Trigger

Yes.

## Prompt

We want to ship the new onboarding flow behind a feature flag. Create the implementation spec and rollout plan first.

## Deterministic Assertions

- contains: feature flag
- contains: rollout
- contains: rollback
- contains: acceptance criteria

## Expected Behavior

- Define flag behavior, default state, rollout stages, and rollback triggers.
- Include validation for enabled and disabled states.
- Keep unrelated onboarding redesign work out of scope.
- Ask for user/product decisions that are not inferable from repo context.
