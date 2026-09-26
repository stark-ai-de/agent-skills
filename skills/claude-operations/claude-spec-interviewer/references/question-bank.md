# Question Bank

Ask one high-impact question at a time when the answer can change the next question. Use a small batch only when the questions are independent and low-friction. Reuse prior answers, inspect discoverable facts, and ask only unresolved material questions. Summarize at useful milestones and continue until material aspects are resolved or explicitly accepted as non-blocking.

## Discovery

- What exact user-visible or developer-visible outcome should change?
- What problem is happening today, with one concrete example?
- Is this a bugfix, feature, refactor, migration, or repo-wide policy change?
- What is explicitly out of scope?
- What is the smallest version that would still be considered successful?

## Repo Fit

- Which files, modules, or packages are most likely involved?
- Is there an existing abstraction or pattern we should extend rather than replace?
- Which commands are the source of truth for lint, typecheck, tests, and build?
- Are there related issues, ADRs, or prior PRs?
- Does `AGENTS.md`, `CLAUDE.md`, `.claude/rules/**/*.md`, Claude Code auto memory, or another repo guide impose constraints we must preserve?
- Are there existing ADRs, specs, or named requirements that this work depends on or might need to challenge?
- Does this work introduce a durable architecture decision, or is it feature behavior under existing architecture?

## Behavior and Edge Cases

- What should happen on the happy path?
- What should happen on invalid input, empty state, loading, timeout, or partial failure?
- Are there compatibility, accessibility, localization, or performance expectations?
- What must never change as part of this work?
- What exact acceptance check would convince you this is done?

## Delivery and Rollout

- Does this require migration, backfill, config changes, or feature flags?
- Is backward compatibility required?
- Should rollout be phased, all at once, or internal-only first?
- What is the rollback strategy if behavior regresses?
- Are there high-risk areas like auth, billing, secrets, or shared contracts?
- Which repository files should document the resulting spec or ADR expectations, such as `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, or docs indexes?
- Does this change public catalog status, install behavior, trigger behavior, or promotion proof that must be reflected in repo-facing files?
- Does any result need to be distilled into `CLAUDE.md`, `.claude/rules`, or auto memory as a separate artifact, or should those stay evidence-only?

## Artifact Persistence

- If neither the request nor repository establishes a destination, propose `docs/specs/<slug>-spec.md` in the checkpoint.
- Use the existing ADR convention; ask only when its destination is materially ambiguous.
- The default specs or ADR folder is missing. Can I create `<suggested-folder>/`, or should I use a different path?
- The selected specs folder is ignored by git. Should this spec stay local-only, should I unignore that path, or should I use a tracked docs path?
- The proposed spec path is `<path>`. Should I overwrite it, choose a new slug, or update the existing spec?
- Should open question `<question>` block spec creation, or should it be recorded as a non-blocking follow-up?

## Source Challenge

- Which assumptions are inherited from an existing ADR, spec, dependency, or previous implementation?
- Which of those assumptions could plausibly be stale or wrong?
- Should any dependency, framework, API, or platform behavior be checked against current official docs before locking the spec?
- Does the repository already have a pattern that conflicts with the proposed requirement?
- Would a preceding ADR, migration note, or spec update make implementation safer?

## ADR Gate

- Does the spec change package/module boundaries, dependency direction, runtime choice, storage model, public contracts, or auth/security model?
- Is there an existing ADR that already decides this?
- If a new ADR is needed, what is the one-sentence decision?
- Is implementation blocked until the ADR is accepted?

## Final verification

Prepare the full reviewable draft before this checkpoint. Reuse answers and authority already in the conversation. Ask only the material decisions still open; the discovery and repository-fit prompts above should normally be answered from inspection.

- “Approve this version and save it to `<spec-path>` with the listed required ADR/index writes?” Include previously unapproved directory creation or overwrite in that same question.
- When saving and paths were already authorized: “Approve this version for the agreed destination?” Do not separately ask whether to save it again.
- If a required ADR remains proposed: distinguish approval to save the draft from acceptance of the architectural decision.
- If chat-only delivery was requested: verify the content when needed and deliver it in chat without offering an unwanted save.

A native plan approval may provide this checkpoint. Ask no duplicate chat question. Unambiguous “change A and save” replies authorize that bounded revision; only additional material uncertainty needs another question.
