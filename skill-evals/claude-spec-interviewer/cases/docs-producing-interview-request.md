# Docs-Producing Interview Request

## Should Trigger

Yes.

## Prompt

I want a relentless, docs-producing interview for a Claude Code implementation spec. Help me define the notification retry redesign before coding.

## Expected Behavior

- Activate `claude-spec-interviewer`.
- Use focused follow-up questions and durable documentation.
- Do not copy third-party skill text, route the task to a third-party skill, or create a glossary unless the repo convention or user explicitly asks for one.
- Produce a repo-native implementation spec with source challenge, ADR gate, validation, rollout, and done-when criteria.
- Preserve resolved terms and decisions in the spec and any required ADR.
- Save the spec by repo convention after the final checkpoint, unless persistence is declined or blocked.
