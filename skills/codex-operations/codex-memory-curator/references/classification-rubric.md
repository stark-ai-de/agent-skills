# Memory Classification Rubric

Use this reference when the classification decision is not obvious from `SKILL.md`.

## Decision Tree

1. Does the entry contain a secret, credential, customer data, private identifier, or sensitive personal data?
   - Classify `DELETE`.
   - Tag `sensitive`.
   - Do not print the full value.
2. Is the entry false, stale, one-off, duplicated, or tied to an old branch/debugging session?
   - Classify `DELETE` unless a scoped rewrite would preserve durable value.
3. Is it a repo-specific rule, command, path, workflow, test gate, coding convention, or generated-file restriction?
   - Classify `MOVE TO AGENTS.md` if it is short and operational.
   - Classify `MOVE TO REPO DOCS` if it needs detailed explanation.
4. Is it a reusable procedure that should load only when asked?
   - Classify `MOVE TO SKILL`.
5. Is it a Codex behavior setting?
   - Classify `MOVE TO CONFIG`.
6. Is it a stable, cross-repo personal preference that is short and accurate?
   - Classify `KEEP`.
7. Is the useful idea too broad, too strong, ambiguous, or missing scope?
   - Classify `KEEP BUT REWRITE`.
8. If evidence is insufficient, classify `ASK USER`.

## Primary Classifications

| Classification      | Use when                                                                   | Typical action                               |
| ------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| `KEEP`              | Stable personal preference, durable across repos, short, accurate          | Leave as-is                                  |
| `KEEP BUT REWRITE`  | Useful but too broad, stale, vague, long, or forceful                      | Rewrite with scope and verification language |
| `MOVE TO AGENTS.md` | Repo-specific rule, command, path, convention, ownership, or restriction   | Add or move to current repo `AGENTS.md`      |
| `MOVE TO REPO DOCS` | Longer architecture or operations context useful to humans and agents      | Move to a repo document                      |
| `MOVE TO SKILL`     | Reusable workflow or checklist that should load on demand                  | Create/update a skill                        |
| `MOVE TO CONFIG`    | Memory behavior, model setting, tool toggle, or agent runtime config       | Move to config and remove from memory        |
| `DELETE`            | Harmful, stale, duplicated, sensitive, too narrow, one-off, or conflicting | Remove after approval and backup             |
| `ASK USER`          | Cannot be safely classified from available evidence                        | Ask one focused question before editing      |

## Review Questions

Ask these internally for every atomic entry:

1. Is this stable for months?
2. Is this a personal preference or a repo rule?
3. Could this mislead Codex in another repository?
4. Is it phrased too strongly?
5. Does it contain `always`, `never`, or `must` when the rule is contextual?
6. Is it duplicated?
7. Does it conflict with `AGENTS.md`, repo docs, package files, or the current user prompt?
8. Does it contain secrets, customer data, private identifiers, or sensitive personal data?
9. Would this be more precise as a skill, config setting, or repo document?
10. Is it short enough to be a memory?

## Good Memory Examples

```text
User prefers pnpm when a repo supports pnpm.
```

Why it works: it is personal, short, and conditional.

```text
User prefers review findings to lead before summaries.
```

Why it works: it describes a stable communication preference.

```text
When using memory-derived facts that were not verified in the current turn, briefly say they may be stale.
```

Why it works: it is cross-repo and protects accuracy.

## Bad Memory Examples

```text
Always use service classes.
```

Problem: too broad and architectural. It may fight repo conventions.

Better:

```text
User often prefers explicit service boundaries in TypeScript apps, but current repo conventions and source code should decide the final structure.
```

```text
Run pnpm turbo test in this repo.
```

Problem: repo-specific command.

Better destination: `AGENTS.md`.

```text
The migration branch is fix/api-client-2024.
```

Problem: temporary branch state.

Better classification: `DELETE`.

## Always, Never, Must Rules

Hard words are allowed only when the rule is truly durable and global, such as "never print secrets".

Most memory rules should be softened:

| Over-strong memory                    | Safer rewrite                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Always use pnpm.                      | Prefer pnpm when the repo supports it or the user requests it.                                 |
| Never run tests without asking.       | Ask before long-running or destructive validation; run cheap focused checks when appropriate.  |
| Must use AGENTS.md for all repo rules | Put repo-specific durable instructions in `AGENTS.md`; short user-wide preferences may remain. |
| Always avoid edits in dirty trees.    | In dirty trees, inspect existing changes and avoid reverting user work.                        |

## Scope Tests

- Cross-repo and personal: usually memory.
- Current-repo only and operational: `AGENTS.md`.
- Current-repo only and detailed: repo docs.
- Repeatable procedure with many steps: skill.
- Runtime behavior switch: config.
- One-off, stale, sensitive, or conflicting: delete.

## Ask-User Examples

Ask the user when:

- A memory appears to encode a strong preference, but it conflicts with recent behavior.
- A repo-specific rule may actually be a user-wide preference.
- Deleting an entry could remove a preference the user intentionally relies on.

Ask one focused question:

```text
Should this be a global preference, or should I move it into this repo's AGENTS.md?
```
