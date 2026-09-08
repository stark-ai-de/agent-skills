---
name: skill-repo-curator
description: Maintain a public Agent Skills repository. Use when updating skill catalogs, validating SKILL.md files, preparing a release, deprecating skills, reviewing install commands, checking README consistency, or keeping a skills repo ready for npx skills installation.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: skill-maintenance
  version: "0.1.1"
---

# Skill Repo Curator

## Goal

Keep a public Agent Skills repository coherent, installable, safe, and ready for users who install skills through `npx skills`.

## When to use

- The user asks to maintain or release a skills repository.
- The README catalog may not match the `skills/` tree.
- Validation, deprecation, publishing, or install commands need review.

## When not to use

- The user wants to write a single skill; use `skill-authoring-review`.
- The user wants install help only; use `skill-installation-support`.
- The repository is not a skills repository and needs a general audit; use `repo-health-audit`.

## Inputs

- `skills/**/SKILL.md`
- `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `LICENSE`
- `package.json`, validation scripts, and CI workflows
- Output from `npm run validate`, `npm run list`, and the local `npx skills` discovery command.

## Inputs to inspect

- Inspect the skill tree, catalog docs, validation scripts, ignored local helper installs, and install smoke-test output.
- Check that upstream helper skills are installed project-locally rather than vendored into the public catalog.

## Process

1. Inspect the skill tree and top-level repository files.
2. Run the local validation and listing commands when possible.
3. Compare README catalog entries against discovered skills.
4. Check install commands for `<github-owner>/<repo>` placeholders or final repository coordinates.
5. Review changelog and release checklist when preparing a release.
6. Apply deprecation policy before removing or replacing a skill.
7. Report the exact validation status, drift, and next action.

## Workflow

Follow the process above, fix structural drift first, then update catalog, changelog, and release notes.

## Decision points

- If a skill is obsolete, prefer deprecation over deletion.
- If README and skill tree disagree, update the catalog or explain why the skill is intentionally hidden.
- If validation fails, fix structural errors before content polish.
- If project-local helper skills exist under `.agents/skills/`, use `npx skills@latest add ./skills --list` for local discovery so helper skills do not mask the publishable catalog.

## Safety rules

- Do not publish, push, tag, install globally, or change remote settings without explicit approval.
- Do not add private paths, secrets, internal hostnames, or copied proprietary skill text.
- Do not vendor already-published upstream skills into `skills/` or `incubator/skills/`; use ignored project-local `npx skills` installs.
- Prefer read-only checks unless the user asks for repository edits.

## References

Read only when needed:

- `references/agent-skills-release.md` when preparing a release for this repository.
- `references/repo-release-checklist.md` before a release.
- `references/deprecation-policy.md` before replacing or removing a skill.

## Scripts

No bundled scripts.

## Output format

Return:

1. Repository status
2. Catalog drift
3. Validation result
4. Release or deprecation notes
5. Blocking issues
6. Recommended next action

## Failure modes

- If the `skills` CLI cannot discover local skills, report the exact command output.
- If upstream helper skills are vendored into `skills/`, block public release until they are removed or intentionally licensed for redistribution.
- If validation scripts disagree, treat the stricter failure as release-blocking.

## Completion criteria

- The repo validates.
- The README catalog matches the skill tree or intentional differences are documented.
- Install commands are correct for local and public use.
- Any release or deprecation path is explicit.
