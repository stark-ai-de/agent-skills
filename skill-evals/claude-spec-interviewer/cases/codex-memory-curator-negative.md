# Codex Memory Curator Negative

## Should Trigger

No.

## Prompt

Audit my Codex memories for stale repo rules, duplicated entries, and sensitive values. Give me a cleanup plan.

## Expected Behavior

- Do not activate `claude-spec-interviewer`.
- Route to a Codex memory review workflow when available, because this is about Codex memory state rather than a Claude Code-ready implementation spec.
- Do not create an implementation spec, ADR gate, or Claude Code execution prompt.
