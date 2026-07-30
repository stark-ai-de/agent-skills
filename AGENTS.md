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
- Store every repository ADR as linked `.short.md`, `.long.md`, and `.guide.md` files. Long is canonical; Short is a faithful abstraction; Guide is non-normative.
- Keep one decision per ADR and do not impose numeric word, paragraph, or section limits.
- Keep accepted ADR IDs, filename stems, and decision text stable; change architecture through a reciprocal successor ADR, not an in-place decision rewrite.
- Treat Accepted repository ADRs as binding. If a user requests a conflicting change, name the conflict, warn visibly, and stop the affected implementation until an adaptation or successor decision is accepted.
- Stable public skills with multiple material workflows must expose their complete finite options. Select, explain, and proceed when task intent and existing authority are clear; ask on bare or materially ambiguous invocation, and never infer mutation beyond the user's requested outcome and scope, as required by ADR-0038.
- Follow `docs/specs.md` for spec persistence, ADR linkage, filename examples, and repo-facing documentation update rules.
- Do not copy copyrighted skill text from other repositories. Use them only as inspiration.
- Do not vendor already-published third-party skills into `skills/`; install them project-locally with `npx skills`.
- Do not stage files with `git add` unless the user explicitly asks.
- Do not unstage files or otherwise change Git index state unless the user explicitly asks.
- Create linked Git worktrees only under `<repo>/.worktrees/<name>`.
- Run `npm run validate` before finalizing changes.
