# 2026-07-10 Native Plan Mode Lifecycle Revision

## Scope

Revise `cursor-spec-interviewer` so native Cursor Plan Mode is the required interview environment when the active client supports it, with a separate save-only persistence continuation after user verification. This is a minor behavior change from `0.1.0` to `0.2.0`.

## Changes

- Added a preflight that detects active Plan Mode, requests a user-approved transition when available, or gives editor and CLI switching instructions when the request capability is absent.
- Required Cursor's structured question tool for material decisions in Plan Mode and limited conversational fallback to unsupported or explicitly declined Plan Mode, with the reason recorded.
- Prohibited writes throughout the Plan Mode interview. The verified checkpoint now produces a persistence-pending, save-only continuation that writes only the approved spec, required ADR, and convention-required minimal ADR index entry outside Plan Mode; emits the Cursor execution prompt; and stops without feature implementation.
- Updated the default prompt, eval proof, rubric, and plan-before-coding case, and added a focused lifecycle case.

## Evidence

- Static review covers active, inactive, unavailable-transition, unavailable-mode, explicitly declined, persistence-pending, and save-only continuation branches.
- Interactive entry smoke passes in Cursor Agent: a disposable Git workspace installed `cursor-spec-interviewer` `0.2.0`, then `cursor-agent --print --mode=plan` loaded the skill, confirmed native Plan Mode was active, and emitted an `askQuestionInteractionQuery` for exactly one material decision.
- A before/after SHA-256 inventory of all 47 disposable-workspace files was identical, proving the live Plan Mode interview made no repository writes.
- The interactive smoke intentionally stopped after the first structured question. Plan Mode exit and save-only persistence remain source-backed/static checks rather than live Cursor verification.
- Executed 2026-07-10: `npm run validate` passes, including skill, ADR, script, draw.io, SkillOpt, and site validation.
- Executed 2026-07-10: scoped `oxfmt --check` and `git diff --check` over the changed Cursor skill and eval files pass; `pnpm lint` also passes.
- Repository-wide `pnpm format:check` remains blocked by the pre-existing, out-of-scope formatting change in `scripts/validate-skillopt-setup.mjs`; this revision does not modify that file.

## Result

Lifecycle revision adopted for the Cursor-specific skill. Native Plan Mode entry, current-skill loading, structured user input, and the read-only boundary pass interactively; exit and persistence coverage remains static. Repository-wide validation remains part of the release-level verification.
