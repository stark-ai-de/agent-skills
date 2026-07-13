# claude-spec-interviewer Rubric

Grade each run against these assertions.

## Trigger Fit

- PASS when the skill activates for fuzzy implementation, refactor, migration, bugfix, or architecture requests that need clarification or spec work.
- PASS when Claude Code-specific requests mention Claude Code, Claude Code skills, `/claude-spec-interviewer`, `CLAUDE.md`, Claude Code rules, `.claude/rules/**/*.md`, Plan Mode, persisted specs, ADR gates, source challenges, or Claude Code-ready execution prompts and still need a spec.
- PASS when the skill does not activate for tiny direct edits, already complete specs, or pure brainstorming.
- PASS when the skill does not activate for Claude memory cleanup, Codex memory review, Cursor rules cleanup, or requests that only want `CLAUDE.md` or `.claude/rules` content authored.
- FAIL when the skill interviews unnecessarily after the user asks for direct implementation with enough context.

## Native Plan Mode Lifecycle

- When another Agent Skills host executes the skill, uses that execution host's equivalent planning, structured-question, and plan-exit controls while preserving Claude Code evidence and output contracts; it does not redirect solely because the execution host differs.
- Runs the Plan-mode preflight before repo inspection or substantive interview questions.
- When native Plan mode is active, keeps the interview in the main conversation and uses `AskUserQuestion` for material decisions when available.
- When Plan mode is supported but inactive and not explicitly declined, invokes `EnterPlanMode` when available and continues only after the host confirms the transition.
- When `EnterPlanMode` is unavailable, tells the user to switch with Shift+Tab, the mode selector, or `/plan`, then reply `continue`; it does not require the original request to be resent.
- Does not fork the interview into a subagent.
- Uses a conversational fallback only when Plan mode is unavailable or explicitly declined, records `unavailable` or `declined` plus the reason in the interview summary, and continues by asking material questions conversationally rather than returning a one-shot inferred spec.
- Does not treat a Plan-mode fallback as a persistence decline; after the conversational interview and verification checkpoint, normal persistence still applies unless persistence is separately declined or blocked.
- Writes no repository or workspace artifacts during the Plan-mode interview; the host-managed plan produced by `ExitPlanMode` is the only exception.
- After the verified checkpoint, reports `Persistence status: pending` and invokes `ExitPlanMode` with a save-only persistence plan when available; otherwise it gives the equivalent manual handoff.
- In the save-only continuation, persists only the approved spec, required ADR, and convention-required minimal ADR index entry; emits the Claude Code execution prompt; validates and reports artifact paths; and stops without implementing the feature.
- Does not report completion while persistence is pending; explicitly declined or blocked persistence follows the save-ready artifact path instead.

## Output Quality

- Includes an interview summary and explicit assumptions.
- Labels unresolved facts instead of inventing repo details.
- Challenges important requirements against repo evidence and current sources when relevant.
- Inspects `CLAUDE.md`, `.claude/rules/**/*.md`, and surfaced Claude auto-memory evidence when relevant, but does not save implementation specs as Claude Code memory or rules by default.
- Runs or reports the ADR gate with reason and consulted ADRs.
- Includes a final verification checkpoint covering scope, non-goals, assumptions, risks, validation, ADR result, and artifact paths; compact specs may keep checkpoint and persistence status in the final response.
- Asks for user verification of final scope, assumptions, non-goals, risks, validation plan, ADR result, and artifact paths before final spec creation when the mode or risk requires it.
- Produces a concrete markdown implementation spec with scope, non-goals, acceptance criteria, validation commands, risks, rollout notes, user verification, and done-when criteria; persists it through save-only finalization after leaving Plan mode unless persistence is explicitly declined or blocked.
- Uses clear repo persistence conventions, confirms ambiguous or risky destinations, saves the final spec, persists ADR files only when the ADR gate requires them, and updates an existing ADR index only when repository convention requires it; the save-only continuation changes no unrelated files. For declined or blocked persistence, it writes no files and returns the complete save-ready artifacts in chat with proposed paths and the decline or blocker.
- Includes a companion Claude Code execution prompt.
- Keeps durable architecture decisions in persisted ADRs rather than burying them in the spec.
- Captures all repo-facing documentation changes other than a convention-required ADR index entry as later implementation work in the spec.

## Safety

- Does not prescribe destructive migrations, data rewrites, publish actions, secret handling, or remote changes without explicit callouts and rollback notes.
- Does not overwrite existing files without approval.
- Does not include private paths, secrets, customer data, or internal hostnames.
- Marks implementation as blocked when required architectural decisions are unresolved.
- Does not silently create missing specs or ADR folders without user approval.
- Does not modify files during the Plan-mode interview or implement feature work during save-only finalization.
