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
- Risky changes include rollback. The Claude Code execution prompt is usable without another avoidable interview.

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

## Executable assignment readiness

- Separate the overall roadmap, active slice, and authorized delivery boundary. Identify dependencies and the first observable result; do not hand over an entire product as one undifferentiated task.
- State repository/branch context and relevant existing changes, accepted versus proposed decisions, actual implementation authority, non-goals, and material unresolved choices. A model-authored authorization field is not user approval.
- Give the slice concrete acceptance scenarios and an executable feedback path. Mark commands as existing, verified, or to be created; do not present proposed commands as passing evidence.
- Defer later-phase research unless it is a current dependency. Name the experiment or decision that ends a necessary investigation, and what should happen if it remains blocked.
- Specify continuation explicitly: stop after this slice, or continue through the listed already-authorized slices. A small checkpoint must not truncate an authorized end-to-end task or authorize the next phase by itself.
- When relevant, include a recovery checkpoint, shared-capacity-aware delegation, ownership boundaries, and independent review. Do not prescribe particular models, thinking levels, tool-call counts, or extra agents without task evidence.

## Assessment and handoff writing

Lead with the current result and next consequential action. Separate observed facts, hypotheses, recommendations, and required user decisions. For a material claim, identify the subject/revision, evidence source or command, environment, result and limitation; reuse the repository's evidence format rather than adding another mandatory report.

Report state transitions precisely: a file write, local check, remote runner start, completed CI, merge, and deployed feature are different outcomes. Activity counts, token counters, heartbeat bytes, and lengthy reports are not effectiveness or cost proof. When assessing an agent, compare requested outcomes, verified artifacts, validation and repeated work; label inferences about causes instead of claiming to know internal reasoning.

Keep reusable reports and examples free of private session transcripts, paths, hostnames and credentials. Preserve required technical constraints with neutral examples. Record durable decisions and useful checkpoints once; avoid repeated full drafts, speculative historical cleanup, and new status reports that add no evidence.
