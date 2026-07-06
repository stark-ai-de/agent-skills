# 2026-07-06 Promotion Review

## Scope

Static promotion review for adding `cursor-spec-interviewer` to the public catalog as a Cursor-native counterpart to `codex-spec-interviewer`.

## Evidence

- Skill has a focused trigger description with explicit Cursor Agent and negative trigger cases.
- Skill includes self-contained templates, rubrics, examples, ADR gate guidance, source-challenge guidance, and a Cursor execution prompt asset.
- Eval cases cover fuzzy Cursor implementation requests, Cursor rules with ADR implications, architecture changes, already specified work, Codex memory cleanup, and tiny direct edits.
- Executed 2026-07-06: `npm run validate`, `pnpm format:check`, `pnpm lint`, `npm run smoke:install`, and `node scripts/validate-release.mjs --base-ref origin/main` pass with this skill in the public catalog.
- Executed 2026-07-06: temp-project installs with `npx skills@latest add <repo>/skills --skill cursor-spec-interviewer -a cursor -y --copy` and `--skill codegraph-ast-grep -a cursor -y --copy` place `SKILL.md` under `.agents/skills/<skill>/`.
- Manual Cursor UI discovery is not exercised by repository CI; use the documented global install command and confirm the skill appears in Cursor Customize -> Skills before release publication.

## Result

Promote as the first Cursor operations public skill, with future run summaries added here after model-graded eval runs or manual Cursor UI checks.
