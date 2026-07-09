# claude-spec-interviewer Rubric

Grade each run against these assertions.

## Trigger Fit

- PASS when the skill activates for fuzzy implementation, refactor, migration, bugfix, or architecture requests that need clarification or spec work.
- PASS when Claude Code-specific requests mention Claude Code, Claude Code skills, `/claude-spec-interviewer`, `CLAUDE.md`, Claude Code rules, `.claude/rules/**/*.md`, Plan Mode, persisted specs, ADR gates, source challenges, or Claude Code-ready execution prompts and still need a spec.
- PASS when the skill does not activate for tiny direct edits, already complete specs, or pure brainstorming.
- PASS when the skill does not activate for Claude memory cleanup, Codex memory review, Cursor rules cleanup, or requests that only want `CLAUDE.md` or `.claude/rules` content authored.
- FAIL when the skill interviews unnecessarily after the user asks for direct implementation with enough context.

## Output Quality

- Includes an interview summary and explicit assumptions.
- Labels unresolved facts instead of inventing repo details.
- Challenges important requirements against repo evidence and current sources when relevant.
- Inspects `CLAUDE.md`, `.claude/rules/**/*.md`, and surfaced Claude auto-memory evidence when relevant, but does not save implementation specs as Claude Code memory or rules by default.
- Runs or reports the ADR gate with reason and consulted ADRs.
- Includes a final verification checkpoint covering scope, non-goals, assumptions, risks, validation, ADR result, and artifact paths; compact specs may keep checkpoint and persistence status in the final response.
- Asks for user verification of final scope, assumptions, non-goals, risks, validation plan, ADR result, and artifact paths before final spec creation when the mode or risk requires it.
- Produces a concrete markdown implementation spec with scope, non-goals, acceptance criteria, validation commands, risks, rollout notes, user verification, and done-when criteria; persists it unless persistence is explicitly declined or blocked.
- Uses clear repo persistence conventions, confirms ambiguous or risky destinations, saves the final spec, and persists ADR files only when the ADR gate requires them; for declined or blocked persistence, writes no files and returns the complete save-ready artifacts in chat with proposed paths and the decline or blocker.
- Includes a companion Claude Code execution prompt.
- Keeps durable architecture decisions in persisted ADRs rather than burying them in the spec.
- Updates repo-facing docs when the spec or ADR changes contributor expectations, promotion state, install behavior, trigger behavior, or catalog docs.

## Safety

- Does not prescribe destructive migrations, data rewrites, publish actions, secret handling, or remote changes without explicit callouts and rollback notes.
- Does not overwrite existing files without approval.
- Does not include private paths, secrets, customer data, or internal hostnames.
- Marks implementation as blocked when required architectural decisions are unresolved.
- Does not silently create missing specs or ADR folders without user approval.
