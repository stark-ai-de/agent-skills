# Spec Rubric

Use this before finalizing the implementation spec.

## Mode Selection

| Mode       | Use when                                                                         | Required depth                                        |
| ---------- | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `compact`  | one-file or tightly scoped feature/bugfix with low ambiguity                     | enough to implement safely in one sitting             |
| `standard` | default for most features, bugfixes, refactors, migrations                       | explicit requirements, file plan, validation, risks   |
| `deep`     | repo-wide refactor, architecture change, migration, multi-team or phased rollout | requirements, design, phased tasks, rollout, rollback |

## Required Sections

| Section                            | Compact   | Standard | Deep     |
| ---------------------------------- | --------- | -------- | -------- |
| Frontmatter                        | required  | required | required |
| Goal                               | required  | required | required |
| Scope                              | required  | required | required |
| Non-goals                          | optional  | required | required |
| Repo context                       | required  | required | required |
| Assumptions / open questions       | required  | required | required |
| Requirements / acceptance criteria | required  | required | required |
| ADR gate                           | required  | required | required |
| Design notes                       | optional  | required | required |
| Task breakdown                     | light     | required | required |
| Validation commands                | required  | required | required |
| Source challenge                   | required  | required | required |
| Risks / rollout                    | optional  | required | required |
| Artifact path / persistence        | path only | required | required |
| Done when                          | required  | required | required |

## Acceptance criteria bar

- Specific, testable requirements and bounded scope; actual repository facts and commands where known.
- Important assumptions challenged against repository evidence and current primary sources when relevant; skipped checks explained.
- Durable decisions in ADRs, with proposed persistence and acceptance distinguished; feature details stay in the spec.
- Complete reviewable content prepared before one approval covering the revision and its concrete writes. Reuse prior answers and exact authority.
- Planning and permissions capability-gated independently; missing controls allow conversation, never unproven writes.
- Delivery matches the request: saved artifacts read back or explicit chat-only output fulfilled. Pending Plan exit or blocked requested save is not success.
- Risky changes include rollback. The Cursor Agent execution prompt is usable without another avoidable interview.

## Final self-check

- Are scope, non-goals, acceptance criteria, commands, risks and unknowns concrete?
- Did the interview resolve material choices without asking again about facts or answers already available?
- Does the reviewed version include the final spec, required ADR content and exact paths/write actions?
- Is approval of that unchanged version reused, including across a native Plan exit?
- Were only affected changes reconfirmed after material content, destination, write-scope or target-state drift?
- Were native tools used only when exposed and permitted, without blocking permissible reads on a mode switch?
- Was silence, timeout or a preselected answer kept distinct from consent?
- Were writes deferred during native Plan or unknown mode/permission state?
- Are content approval and actual persistence recorded separately, once each?
- Did requested persistence succeed and get read back, or did explicit chat-only delivery complete?
- Are required ADR acceptance gates visible and minimal required index writes included?
- Did the interviewer finish save-only work without implementing features or unrelated docs, preserving any separately authorized outer workflow?
