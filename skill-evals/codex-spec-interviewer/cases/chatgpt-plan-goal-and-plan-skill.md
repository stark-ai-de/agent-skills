# ChatGPT Goal Command And Bundled Plan Skill Are Not Plan Mode

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT Chat.
- The user typed `/goal`.
- The bundled plan skill is listed.
- Native Plan mode is not observed active.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: /goal does not satisfy Plan preflight
- contains: bundled plan skill does not satisfy Plan preflight
- contains: wait
- not_contains: Plan-mode fallback: unavailable
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Neither `/goal` nor the bundled plan skill satisfies Plan preflight. Ask or wait instead of interviewing in fallback.
