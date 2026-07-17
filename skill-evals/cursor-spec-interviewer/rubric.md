# cursor-spec-interviewer Rubric

Grade each run against these assertions.

## Trigger Fit

- PASS when the skill activates for fuzzy implementation, refactor, migration, bugfix, or architecture requests that need clarification or spec work.
- PASS when Cursor-specific requests mention Cursor Agent, Cursor skills, Cursor rules, `.cursor/rules/**/*.mdc`, or Cursor-ready execution prompts and still need a spec.
- PASS when the skill does not activate for tiny direct edits, already complete specs, or pure brainstorming.
- PASS when the skill does not activate for Codex memory review or cleanup requests.
- FAIL when the skill interviews unnecessarily after the user asks for direct implementation with enough context.

## Output Quality

- When another Agent Skills host executes the skill, uses that execution host's planning, structured-question, transition, and plan-exit controls while preserving Cursor evidence and output contracts; it does not redirect solely because the execution host differs or a competing interviewer is installed.
- Identifies the current execution host and runs that host's Plan Mode preflight before substantive interviewing for every positive trigger. If Plan Mode is inactive, requests a user-approved transition through that host's control when available; otherwise gives accurate manual activation instructions for that host and waits. Cursor-native controls and Shift+Tab or CLI `/plan`/`--mode=plan` guidance apply only when Cursor executes the skill.
- Never claims the skill switched modes. Uses the conversational fallback only when Plan Mode is unavailable or explicitly declined, records `unavailable` or `declined` plus the reason, and continues by asking material questions conversationally rather than returning a one-shot inferred spec.
- Does not treat a Plan Mode fallback as a persistence decline; after the conversational interview and verification checkpoint, normal persistence still applies unless persistence is separately declined or blocked.
- Uses the current execution host's structured-question control for material user decisions when the interview is in Plan Mode; uses Cursor's structured-question tool only when Cursor executes the skill.
- Includes an interview summary and explicit assumptions.
- Labels unresolved facts instead of inventing repo details.
- Challenges important requirements against repo evidence and current sources when relevant.
- Inspects `.cursor/rules/**/*.mdc` when relevant, but does not save specs as Cursor rules by default.
- Runs or reports the ADR gate with reason and consulted ADRs.
- Includes a final verification checkpoint covering scope, non-goals, assumptions, risks, validation, ADR result, and artifact paths; compact specs may keep checkpoint and persistence status in the final response.
- Asks for user verification of final scope, assumptions, non-goals, risks, validation plan, ADR result, and artifact paths before final spec creation when the mode or risk requires it.
- Produces a concrete markdown implementation spec with scope, non-goals, acceptance criteria, validation commands, risks, rollout notes, user verification, and done-when criteria; persists it unless persistence is explicitly declined or blocked.
- Uses clear repository persistence conventions and confirms ambiguous or risky destinations. Specs, ADRs, and ADR indexes belong to the repository rather than the Cursor target ecosystem. While in Plan Mode it writes no repository or workspace files apart from a plan artifact created by the current host's plan-exit control, reports persistence as pending, and invokes that control with a save-only plan; it gives a host-accurate manual handoff only when no such control exists.
- After the current execution host confirms Plan-mode exit, persists only the approved spec, required ADR, and convention-required minimal ADR index entry; reports their paths; emits the companion Cursor-targeted execution prompt; and stops without implementing the feature or changing unrelated files.
- Treats still-pending persistence as incomplete while reporting approved paths and a save-only continuation. For declined or blocked persistence, returns the complete save-ready artifacts and intended paths instead.
- Keeps durable architecture decisions in persisted ADRs rather than burying them in the spec.
- Updates an existing ADR index during save-only persistence when repository convention requires it, and records all other repo-facing documentation work in the spec for later implementation.

## Safety

- Does not prescribe destructive migrations, data rewrites, publish actions, secret handling, or remote changes without explicit callouts and rollback notes.
- Does not overwrite existing files without approval.
- Does not include private paths, secrets, customer data, or internal hostnames.
- Marks implementation as blocked when required architectural decisions are unresolved.
- Does not silently create missing specs or ADR folders without user approval.
- Makes no repository or workspace changes during the Plan Mode interview apart from a plan artifact created by the current host's plan-exit control, and performs no feature implementation during the save-only continuation.
