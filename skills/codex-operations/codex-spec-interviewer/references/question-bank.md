# Question Bank

Ask one high-impact question at a time when the answer can change the next question. Use a small batch only when the questions are independent and low-friction. Start with the highest-impact unknowns, summarize after each answer or evidence pass, and continue only when uncertainty still blocks a safe implementation spec.

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

- I found `<existing-spec-dir>` for specs and will use that convention unless you want a different destination.
- I need confirmation for `<suggested-spec-dir-or-adr-path>` because the destination is missing, ambiguous, public/private sensitive, an overwrite, or an ADR write.
- Here is the scope, non-goals, assumptions, risks, validation plan, ADR result, final spec path, and any required ADR path. Is anything material missing or wrong before I save the spec?
- Which remaining unknowns are acceptable as non-blocking, and which should block implementation?
