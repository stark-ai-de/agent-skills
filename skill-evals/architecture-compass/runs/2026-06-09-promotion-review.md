# 2026-06-09 Promotion Review

## Scope

Static promotion review for moving `architecture-compass` from incubator to the public catalog.

## Evidence

- Skill has a focused trigger description for ADR governance setup, ADR-guided refactors, architecture drift review, new implementation placement, stack-deviation checks, backend runtime composition, and Next.js request-boundary work.
- Runtime guidance exposes two user-facing actions: `setup` for durable ADR guardrails and `refactor` for applying ADRs, stack rules, and examples to code or diffs.
- Negative scope excludes tiny edits, style-only cleanup, dependency-only updates, generic framework explanations, and unrelated debugging tasks.
- Setup mode is bounded to repo-facing guardrail files and requires discovering existing ADR/docs conventions before creating new structures.
- Refactor mode requires target repo evidence, provenance-labeled rules, conflict reporting, file-role mapping, minimal reversible changes, and validation.
- References and templates keep `SKILL.md` concise while preserving source-structure, request-boundary, backend-runtime, setup, and conflict-resolution guidance.
- Eval cases cover setup, refactor, new implementation, new repo bootstrap, backend composition, PR drift review, stack deviation, and negative activation cases.

## Result

Promotion-ready after validation passed.

Validation evidence captured during promotion review:

- `npm run validate` passed.
- `npm run list` listed `architecture-compass` as a public skill.
- `npm run list:incubator` did not list `architecture-compass`.
- `npx skills@latest add ./skills --list` listed 4 public skills including `architecture-compass`.
- `npm run smoke:install` passed clean-copy public install discovery.
- `node scripts/check-release-intent.mjs --base-ref origin/main && node scripts/validate-release.mjs --base-ref origin/main` passed for `v0.4.0`.
- `pnpm format:check` passed.
- `git diff --check` passed.
