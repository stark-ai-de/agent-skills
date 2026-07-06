# Cursor Context Classification Rubric

Use this reference when the classification decision is not obvious from `SKILL.md`.

## Decision Tree

1. Does the claim contain a secret, credential, customer data, private identifier, or sensitive personal data?
   - Classify `DELETE`.
   - Tag `sensitive`.
   - Do not print the full value.
2. Is the claim false, stale, one-off, duplicated, or tied to an old branch/debugging session?
   - Classify `DELETE` unless a scoped rewrite preserves durable value.
3. Is the claim a project-specific Cursor instruction that benefits from rule metadata or file scoping?
   - Classify `MOVE TO CURSOR PROJECT RULE`.
4. Is the claim a simple repo instruction that should work across agents?
   - Classify `MOVE TO AGENTS.md`.
5. Is the claim longer architecture or operations context?
   - Classify `MOVE TO REPO DOCS`.
6. Is the claim a stable user-wide Cursor preference?
   - Classify `MOVE TO CURSOR USER RULES`.
7. Is the claim a durable team-wide standard?
   - Classify `MOVE TO CURSOR TEAM RULES`.
8. Is the claim a reusable on-demand workflow?
   - Classify `MOVE TO SKILL`.
9. Is the claim a tool setting or runtime toggle?
   - Classify `MOVE TO CONFIG`.
10. Is the claim useful but too broad, vague, or forceful?

- Classify `KEEP BUT REWRITE`.

11. If evidence is insufficient, classify `ASK USER`.

## Primary Classifications

| Classification                | Use when                                                    | Typical action                              |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| `KEEP`                        | Accurate durable context in the right Cursor surface        | Leave as-is                                 |
| `KEEP BUT REWRITE`            | Useful but broad, vague, stale, duplicated, or over-strong  | Rewrite with scope and verification wording |
| `MOVE TO CURSOR PROJECT RULE` | Repo guidance needs Cursor `.mdc` metadata or file scoping  | Create or update `.cursor/rules/*.mdc`      |
| `MOVE TO AGENTS.md`           | Simple repo instruction should work across agent runtimes   | Add or move to root or nested `AGENTS.md`   |
| `MOVE TO REPO DOCS`           | Detailed architecture or operations context                 | Move to repo docs or ADRs                   |
| `MOVE TO CURSOR USER RULES`   | Stable user-wide Cursor preference                          | Give manual settings action                 |
| `MOVE TO CURSOR TEAM RULES`   | Durable team-wide Cursor standard                           | Give manual team settings action            |
| `MOVE TO SKILL`               | Reusable workflow should load on demand                     | Create or update a skill                    |
| `MOVE TO CONFIG`              | Runtime setting, MCP setting, tool toggle, or environment   | Move to config and remove from rules        |
| `DELETE`                      | Harmful, stale, duplicated, sensitive, ignored, conflicting | Remove after approval and backup            |
| `ASK USER`                    | Cannot be safely classified from available evidence         | Ask one focused question before editing     |

## Risk Tags

Use risk tags as secondary context only:

- `sensitive`
- `stale`
- `duplicated`
- `too-broad`
- `too-specific`
- `repo-specific`
- `workflow`
- `config`
- `conflicting`
- `ignored`
- `legacy`
- `useful`

## Rewrite Guidance

Prefer scoped rules over absolute rules.

| Over-strong claim                         | Safer rewrite                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| Always use pnpm.                          | Prefer pnpm when the repo has pnpm lockfiles or package metadata.             |
| Never edit generated files.               | Do not hand-edit generated files listed by this repo; regenerate from source. |
| Must use React server components.         | Follow the repo's current Next.js rendering conventions for the touched area. |
| Cursor should remember every past choice. | Persist durable project rules only when they remain true for future work.     |

## Confidence

| Confidence | Use when                                                              |
| ---------- | --------------------------------------------------------------------- |
| `high`     | Current files prove the claim is correct, stale, ignored, or unsafe.  |
| `medium`   | Evidence strongly suggests an action, but user intent may differ.     |
| `low`      | The claim could encode a preference; classify `ASK USER` when unsure. |
