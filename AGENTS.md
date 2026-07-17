# Agent Instructions

This repository contains public Agent Skills.

## Rules

- Follow the Agent Skills specification: https://agentskills.io/specification.
- Every skill must have `SKILL.md` with valid `name` and `description`.
- Skill folder names must match frontmatter names.
- Do not include secrets, tokens, customer data, private repo paths, or internal hostnames.
- Keep `SKILL.md` files concise and operational.
- Move long examples, rubrics, and templates into `references/` or `assets/`.
- Prefer read-only scripts. Any script that modifies files must be clearly documented.
- Document repo-level decisions in `docs/adrs/`.
- ADRs must be short. The hard limit is 250 words.
- Follow `docs/specs.md` for spec persistence, ADR linkage, filename examples, and repo-facing documentation update rules.
- Do not copy copyrighted skill text from other repositories. Use them only as inspiration.
- Do not vendor already-published third-party skills into `skills/`; install them project-locally with `npx skills`.
- Do not stage files with `git add` unless the user explicitly asks.
- Do not unstage files or otherwise change Git index state unless the user explicitly asks.
- Create linked Git worktrees only under `<repo>/.worktrees/<name>`.
- Run `npm run validate` before finalizing changes.
