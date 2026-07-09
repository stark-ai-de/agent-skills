# Claude Code Rules ADR Implications

## Should Trigger

Yes.

## Prompt

Use Claude Code to plan a migration from ad hoc API route handlers to a shared route contract. This repo has `.claude/rules/api-style.md`; write the spec before implementation and tell me whether an ADR is needed.

## Expected Behavior

- Activate `claude-spec-interviewer`.
- Inspect `.claude/rules/**/*.md` as repo evidence alongside `AGENTS.md`, ADRs, source layout, and validation commands when present.
- Treat Claude Code rules as constraints or evidence, not as the default artifact format for the implementation spec.
- Run the ADR gate and mark ADR required when the shared route contract changes a durable public or package boundary unless an accepted ADR already covers it.
- Produce a Claude Code-ready execution prompt.
- Save the spec under the repo's existing spec convention or ask before creating or using an ambiguous destination.
