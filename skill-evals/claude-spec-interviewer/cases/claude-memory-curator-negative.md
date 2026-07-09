# Claude Memory Curator Negative

## Should Trigger

No.

## Prompt

Audit my Claude Code memory and rules for stale instructions, duplicated guidance, and sensitive values. Tell me what to prune.

## Expected Behavior

- Do not activate `claude-spec-interviewer`.
- Route to a Claude memory cleanup workflow when available, because this is about durable Claude context rather than a Claude-ready implementation spec.
- Do not create an implementation spec, ADR gate, or Claude Code execution prompt.
