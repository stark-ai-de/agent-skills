# Question Bank

Ask one high-impact question at a time when the answer can change the next question. Use a small batch only when the questions are independent and low-friction. Start with the highest-impact unknowns, summarize after each answer or evidence pass, and continue until every material aspect is covered, source-backed, or explicitly accepted by the user as non-blocking.

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
- Does `AGENTS.md` or another repo guide impose constraints we must preserve?
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

## Artifact Persistence

- Should I save specs under the default `docs/specs/` folder?
- Should I save ADRs under the default `docs/adrs/` folder?
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

## Final Verification

Use this checkpoint before saving final artifacts:

- Here is my current scope, non-goals, assumptions, risks, ADR result, validation plan, and artifact paths. Is anything material missing or wrong?
- Are all listed open questions non-blocking for implementation, or should I keep interviewing?
- Do you approve saving the spec to `<spec-path>` and any ADR to `<adr-path>`?
