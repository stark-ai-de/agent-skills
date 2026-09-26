# Shared single-checkpoint lifecycle

## Should Trigger

Yes, for Cursor Agent-targeted spec work.

## Prompt

Use Cursor Spec Interviewer with each fixed context and answer card in [the shared matrix](../../codex-spec-interviewer/approval-scenarios.json). Continue the actual conversation across turns; do not concatenate expected answers into a one-shot outcome.

## Expected Behavior

Meet each required observation and none of the forbidden observations. Grade with the local rubric. Report actual writes, questions and mode prompts separately. The static matrix inventory does not establish a live behavioral result.
