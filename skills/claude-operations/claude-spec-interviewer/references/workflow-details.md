# Interview and approval lifecycle

Use this reference for the substantive interview and final delivery. The target runtime determines evidence and the execution prompt; the current execution host determines available tools, planning controls, and permissions.

## Planning and permission evidence

Inspect current host context and exposed controls without blocking useful read-only discovery. Record `Planning capability:` as active, available but inactive, unavailable, explicitly declined, or indeterminate, with the evidence. Record `Read-only enforcement:` independently from runtime permissions; a Plan label or a mode command is not proof of enforcement. Report these when they affect the next action, and update them when the state changes.

- Respect active or explicitly requested native Plan mode. Recommend it for substantial open work, but do not require a manual transition before permissible reads or conversation.
- Missing, inactive, busy, older, or unknown controls permit the same conversational interview with a behavioral no-write gate. An indeterminate state is not proof of unavailability and never permits writes. Do not make the user enumerate UI controls merely to answer an unrelated requirements question.
- An explicit refusal is separate evidence: record it and do not recommend Plan again. It does not exit an already active mode or waive write permissions.
- Use only tools actually exposed by the execution host, and follow their restrictions. Structured or asynchronous questions are optional capabilities, not prerequisites. With no suitable tool, ask in ordinary conversation.
- While a material answer is pending, continue only independent authorized work. Silence, a timeout, or a preselected option is not an answer or approval. Keep the dependent decision pending.
- Do not test permissions by writing or silently change host configuration. During the interview, prohibit repository, workspace, and external mutations; a native host-managed plan artifact is allowed only if the host explicitly permits it. Never persist repository artifacts while native Plan is active.

## Interview

1. Classify depth as `compact`, `standard`, or `deep` using [spec-rubric.md](spec-rubric.md). This is one end-to-end workflow; a clear request selects it without another workflow menu. A bare invocation needs the missing task, not a review/save variant choice.
2. Inspect the relevant repository and conversation first. Reuse prior answers and authority; resolve discoverable facts from source. Determine delivery intent and candidate paths using [artifact-destinations.md](artifact-destinations.md). Raise consequential public/private or overwrite ambiguity early, or bundle it into the final checkpoint.
3. Ask only unresolved material questions. Keep dependent decisions in real back-and-forth; batch a few independent choices when useful. Summarize changed understanding at useful milestones, not mechanically after every answer. Use [question-bank.md](question-bank.md) as prompts to consider, not a questionnaire to exhaust.
4. Challenge important assumptions against repository evidence and current primary sources using [source-challenge.md](source-challenge.md). Run [adr-gate.md](adr-gate.md); a proposed ADR may be saved without being accepted, and dependent implementation stays blocked until its decision is accepted.
5. Prepare the complete reviewable spec and any required ADR/index content before requesting approval. Use the matching template in `../assets/`, testable acceptance criteria, concrete validation and explicit unresolved facts. Identify the revision in conversation so the approval applies to that content. Do not ask approval of a summary and then invent the final artifact.

## One final checkpoint

Present the full draft or a reviewable artifact with a concise summary of scope, assumptions, risks, validation, ADR status, delivery and concrete paths. List any directory creation, overwrite, ADR status change and minimal required index update. Reuse already granted authority rather than asking for it again. Ask positively, for example: **Approve this version and save it to `<spec-path>` with the listed artifact writes?** If saving and the destination were already authorized, only the content approval remains.

A native plan approval may be this same checkpoint when it presents and approves the content and exact write scope. Do not add a second chat approval before or after it. A mode toggle alone is not content approval. Keep content verification, write authorization, host state, and actual persistence distinct.

| Existing evidence or change                                  | Next action                                                                                                                             |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Exact draft and listed writes already approved               | Reuse that approval; save when the host permits it.                                                                                     |
| Approval given while Plan remains active                     | Retain approval; request only the required host exit, with persistence pending.                                                         |
| Exit confirmed and approval unchanged                        | Perform the save-only handoff without another verification question.                                                                    |
| Earlier directory creation, overwrite, or save authorization | Carry it into the checkpoint; do not ask again for the same target state.                                                               |
| “Change A and save” identifies an unambiguous bounded edit   | Apply that revision and save within existing authority; do not automatically add a new approval round.                                  |
| Material content, path, write scope, or target state changed | Show the affected difference and confirm only that delta before the affected write.                                                     |
| Draft or approval lost after context loss                    | Recover the reviewed content and authority from available evidence; ask only for what cannot be recovered.                              |
| Explicit chat-only delivery                                  | Deliver the full approved spec and execution prompt in chat; complete that requested delivery with `Persistence status: not requested`. |
| Requested save is blocked or denied                          | Preserve approval, report the specific blocker and unsaved paths, and return save-ready content; persistence remains incomplete.        |

A “yes” to a proposal to save an ADR as `Proposed` does not accept its architecture decision. ADR acceptance must explicitly cover the reviewed decision. Prior acceptance of that exact decision remains valid.

## Save-only handoff

If Plan is active, report `Persistence status: pending Plan-mode exit`. Use the current host's plan-exit control if available and permitted; otherwise state the observed/documented manual exit action. Request only the host action still needed. A suitable continuation is:

```text
Exit Plan mode, then persist the already approved spec to <spec-path>, the listed required ADR artifacts and minimal convention-required ADR index update. Reuse the existing approval. Validate and report the saved paths and emit the target-runtime execution prompt. Do not implement the feature in this save-only handoff.
```

After actual exit, recheck the destination state and write permissions. Unknown mode or permission state means no writes; resolve only the uncertainty that blocks the save. Save only the approved spec, required ADR and minimal required ADR index entry. Read back the artifacts, report actual results, run the final rubric, and emit the target-runtime execution prompt. A partial write failure must report which artifacts were saved and which remain pending; do not claim atomic success.

The interviewer does not implement features or unrelated documentation changes. Its save-only task ends here. An outer workflow may resume separately authorized implementation after this handoff; the spec approval itself never grants that authority.

## Delivery and completion

Report delivery first: saved paths, requested chat-only delivery, or pending/blocked persistence. Follow with material assumptions, source challenge and ADR result, the execution prompt, validation and remaining risks. Avoid repeating the full saved artifacts unless requested. For chat-only delivery or a blocked save, include the complete draft; distinguish a draft awaiting approval from an approved result.

Completion means the requested delivery succeeded: either saved and read back, or explicitly requested chat-only output delivered. Pending Plan exit or a failed requested save is not completion. Record verification once; persistence records actual results separately. Required ADR acceptance remains an independent implementation gate even when delivery is complete.
