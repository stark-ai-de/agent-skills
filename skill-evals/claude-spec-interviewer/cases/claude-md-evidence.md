# CLAUDE.md Evidence

## Should Trigger

Yes.

## Prompt

Use Claude Code to create an implementation plan for adding resumable uploads. This repo has important constraints in `CLAUDE.md` and `.claude/CLAUDE.md`; use them when shaping the spec.

## Expected Behavior

- Activate `claude-spec-interviewer`.
- Inspect `CLAUDE.md`, `.claude/CLAUDE.md`, `AGENTS.md`, existing specs, ADRs, relevant source, and validation commands when present.
- Treat Claude instruction files as evidence and constraints, not as the artifact destination for the implementation spec.
- Ask targeted questions for unresolved upload limits, retry behavior, storage ownership, validation, rollout, and rollback.
- Run the ADR gate if resumable upload storage, public API contracts, or data ownership changes are durable architecture decisions.
- Save the implementation spec under the repo's spec convention, or ask before creating or using an ambiguous destination.
- Include a Claude Code execution prompt that points to the saved spec.
