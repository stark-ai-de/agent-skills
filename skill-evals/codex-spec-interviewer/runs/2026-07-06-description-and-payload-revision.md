# 2026-07-06 Description and Payload Revision

## Scope

Revision of `codex-spec-interviewer` for v0.5.0, porting the structure adopted for `cursor-spec-interviewer` to keep the twin skills aligned. `metadata.version` bumped from the published 0.1.1 to 0.2.0 (the interim 0.1.2 artifact-destination fix was unreleased and is folded in).

## Changes

- Retained the fuller frontmatter trigger definition so the Codex skill still advertises source challenge, verification, persistence, ADR gating, validation, rollout notes, and the Codex execution prompt.
- Deduplicated `SKILL.md` against its own references: destination discovery, artifact filename rules, ADR do/do-not lists, and interview discipline now live only in `references/` with pointers from the workflow. The file went from 181 to 137 lines with no behavior removed; the private-spec folder rule moved into `references/artifact-destinations.md`.
- Removed maintainer-facing content from the installed payload: the self-promotion rule in `SKILL.md` and the skill self-test plan plus adoption notes in `references/rollout-checklist.md`. Grading assertions live in `rubric.md` here. The rollout reference now covers spec validation, phasing, migration, rollback, and monitoring guidance.
- Added a "Codex integration" section: the saved spec is the durable artifact across Codex surfaces, and `AGENTS.md` plus Codex memories are evidence, not the artifact format, unless the user explicitly chooses otherwise.
- Added "when not to use" boundaries for AGENTS.md-authoring-only and Codex-memory requests, matching the existing routing split with `codex-memory-curator`.
- Added eval cases: `plan-before-coding-trigger.md`, `agents-md-artifact-request.md`, `no-spec-structure-repo.md`, `declined-persistence.md`, and `codex-memory-curator-negative.md`.

## Evidence

- Executed 2026-07-06: `npm run validate`, `pnpm format:check`, `pnpm lint`, `npm run smoke:install`, `npx skills@latest add ./skills --list`, temp Codex/Cursor install checks, `node scripts/validate-release.mjs --base-ref origin/main`, and `git diff --check` pass after the revision.
- Pending: a model-graded routing run over the case prompts against the other public skill descriptions, plus with-skill versus baseline output runs. Record results here when executed.

## Result

Revision adopted for v0.5.0. Both spec-interviewer skills now share the same structure; port future shared changes to both in the same release to limit drift.
