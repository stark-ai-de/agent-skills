# 2026-07-06 Description and Payload Revision

## Scope

Pre-release revision of `cursor-spec-interviewer` before its first publication in v0.5.0. No published behavior contract existed yet, so `metadata.version` stays `0.1.0`.

## Changes

- Rewrote the frontmatter description around natural trigger phrases users actually say: spec, implementation plan, PRD, requirements, and plan before coding. The previous description led with internal workflow jargon (`source-challenge`, `ADR-gate`) that did not appear in any positive eval prompt.
- Deduplicated `SKILL.md` against its own references: destination discovery, artifact filename rules, ADR do/do-not lists, and interview discipline now live only in `references/` with pointers from the workflow. The file went from 185 to 139 lines with no behavior removed.
- Removed maintainer-facing content from the installed payload: the self-promotion rule in `SKILL.md` and the skill self-test plan plus adoption notes in `references/rollout-checklist.md`. Grading assertions already live in `rubric.md` here. The rollout reference now covers what it advertises: validation, phasing, migration, rollback, and monitoring guidance for generated specs.
- Added Cursor-native integration guidance: use Cursor's structured question tool for option-style decisions, run inside Plan Mode with the saved spec as the durable artifact, and keep treating `.cursor/rules` as evidence rather than the artifact format.
- Added eval cases: `plan-before-coding-trigger.md` (activation from plan/requirements phrasing), `rule-artifact-request.md` (user asks to store the plan in `.cursor/rules/`), `no-spec-structure-repo.md` (destination confirmation in a repo without conventions), and `declined-persistence.md` (chat-only output on explicit decline).

## Evidence

- Executed 2026-07-06: `npm run validate`, `pnpm format:check`, `pnpm lint`, `npm run smoke:install`, `npx skills@latest add ./skills --list`, temp Cursor install checks, `node scripts/validate-release.mjs --base-ref origin/main`, and `git diff --check` pass after the revision.
- Pending: a model-graded routing run over the case prompts with the new description against the other public skill descriptions, plus with-skill versus baseline output runs. Record results here when executed.

## Result

Revision adopted for the v0.5.0 initial release. The Codex twin `codex-spec-interviewer` was also ported to the deduplicated structure in this change set, so both spec-interviewer skills share the same payload shape while keeping runtime-specific integration notes and execution prompts.
