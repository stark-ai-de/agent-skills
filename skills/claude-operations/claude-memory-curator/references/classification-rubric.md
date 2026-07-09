# Claude Context Classification Rubric

Use this reference when the classification decision is not obvious from `SKILL.md`.

## Decision Tree

1. Does the claim contain a secret, credential, customer data, private identifier, internal hostname, or sensitive personal data?
   - Classify `DELETE`.
   - Tag `sensitive`.
   - Do not print the full value.
2. Is the claim false, stale, one-off, duplicated, or tied to an old branch/debugging session?
   - Classify `DELETE` unless a scoped rewrite preserves durable value.
3. Is the claim a deterministic restriction or automation requirement?
   - Classify `MOVE TO SETTINGS` or `MOVE TO HOOK`.
4. Is the claim a broad Claude Code project instruction?
   - Classify `MOVE TO CLAUDE.md`.
5. Is the claim a personal project-specific Claude preference?
   - Classify `MOVE TO CLAUDE.local.md`.
6. Is the claim path-specific, language-specific, or package-specific Claude guidance?
   - Classify `MOVE TO CLAUDE RULE`.
7. Is the claim a concise learned fact for future Claude Code work?
   - Classify `MOVE TO AUTO MEMORY TOPIC`.
8. Is the claim a cross-agent repo rule?
   - Classify `MOVE TO AGENTS.md` and recommend a `CLAUDE.md` import.
9. Is the claim longer architecture or operations context?
   - Classify `MOVE TO REPO DOCS`.
10. Is the claim a reusable on-demand workflow?

- Classify `MOVE TO SKILL`.

11. Is the claim organization-wide policy?

- Classify `MOVE TO MANAGED POLICY` as a manual action.

12. Is the claim useful but too broad, vague, or forceful?

- Classify `KEEP BUT REWRITE`.

13. If evidence is insufficient, classify `ASK USER`.

## Primary Classifications

| Classification              | Use when                                                   | Typical action                                 |
| --------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| `KEEP`                      | Accurate durable context in the right Claude surface       | Leave as-is                                    |
| `KEEP BUT REWRITE`          | Useful but broad, vague, stale, duplicated, or over-strong | Rewrite with scope and verification wording    |
| `MOVE TO CLAUDE.md`         | Broad project or user Claude instruction                   | Add or move to the right `CLAUDE.md`           |
| `MOVE TO CLAUDE.local.md`   | Private project-specific Claude preference                 | Add or move to `CLAUDE.local.md`               |
| `MOVE TO CLAUDE RULE`       | Path-scoped, package-scoped, or topic-scoped instruction   | Create or update `.claude/rules/*.md`          |
| `MOVE TO AUTO MEMORY TOPIC` | Learned project fact or pattern that should not be a rule  | Add concise index plus topic detail if needed  |
| `MOVE TO AGENTS.md`         | Cross-agent repo rule                                      | Put in `AGENTS.md` and import from `CLAUDE.md` |
| `MOVE TO REPO DOCS`         | Detailed architecture or operations context                | Move to repo docs or ADRs                      |
| `MOVE TO SKILL`             | Reusable workflow should load on demand                    | Create or update a skill                       |
| `MOVE TO SETTINGS`          | Runtime setting, permission rule, sandbox rule, or toggle  | Move to Claude settings                        |
| `MOVE TO HOOK`              | Deterministic lifecycle automation or guard                | Create or update a Claude Code hook            |
| `MOVE TO MANAGED POLICY`    | Organization-wide non-user policy                          | Recommend manual managed-policy change         |
| `DELETE`                    | Harmful, stale, duplicated, sensitive, or conflicting      | Remove after approval and backup               |
| `ASK USER`                  | Cannot be safely classified from available evidence        | Ask one focused question before editing        |

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
- `unenforced`
- `managed-policy`
- `useful`

## Rewrite Guidance

Prefer scoped rules over absolute rules.

| Over-strong claim                 | Safer rewrite                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Always use pnpm.                  | Prefer pnpm when the repo has pnpm lockfiles or package metadata.             |
| Never edit generated files.       | Do not hand-edit generated files listed by this repo; regenerate from source. |
| Must block production deploys.    | Add a PreToolUse hook or permission rule that blocks the deploy command.      |
| Remember every API design detail. | Keep a concise memory index and move detailed API notes to a topic file.      |

## Confidence

| Confidence | Use when                                                               |
| ---------- | ---------------------------------------------------------------------- |
| `high`     | Current files prove the claim is correct, stale, unsafe, or misplaced. |
| `medium`   | Evidence strongly suggests an action, but user intent may differ.      |
| `low`      | The claim could encode a preference; classify `ASK USER` when unsure.  |
