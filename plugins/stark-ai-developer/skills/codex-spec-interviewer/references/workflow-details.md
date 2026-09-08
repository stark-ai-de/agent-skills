# Codex Spec Interviewer workflow details

Read this reference when running the full interview, persistence, or output workflow from `SKILL.md`. The main skill file is the concise entrypoint; this file contains the detailed gates and failure handling.

## Native Plan mode preflight

Run this preflight before substantive interviewing or repository exploration. A skill cannot change the host's collaboration mode during an active turn, and the user's use of the word "plan" does not prove that native Plan mode is active.

Identify the host lane from current host context and distinguish it from the
product being discussed. User-reported composer details can complete the record.

- Codex CLI, Codex IDE extension, or Codex in the ChatGPT desktop app: run the
  native Codex steps below. Do not require the ChatGPT observation fields or
  infer unavailability from a missing slash-menu dump.
- ChatGPT Chat/Work on web, desktop, or mobile, and the distinct Codex web
  experience: run the shared ordered gates below, then the matching handoff.
- Unknown or contradictory host identity: report `Planning capability:
Indeterminate`, ask for the host/surface distinction, and wait without a
  generated transition command.

### Independent read-only enforcement

Every preflight result, including a transition, refusal, or uncertainty stop,
reports two separate evidence-backed lines:

```text
Planning capability: <state> - <mode/control evidence or refusal>
Read-only enforcement: <state> - <scope and permission evidence>
```

Use `enforced`, `available but inactive`, `unavailable`, `explicitly declined`,
`indeterminate`, or `not applicable` for enforcement. The last state is not
valid for this read-only interview. A Plan banner, `/plan` text, or refusal does
not establish filesystem enforcement. Report `enforced` only when current
runtime/permission evidence proves a read-only boundary for the relevant scope.
With known writable permissions, use `available but inactive` only if a
read-only control is observed; otherwise use `unavailable` when its absence is
proven, or `indeterminate` when unknown. In the latter cases, explicitly retain
a behavioral no-write gate: conversation and proven non-mutating reads may
continue, but stop before any check that could write. If the user declines an
enforcement transition, preserve that decision separately and retain the same
gate. Never test enforcement by attempting a write or silently change host
permissions/configuration. Filesystem restrictions do not prove restrictions on
connector or other external mutations; those remain prohibited in the interview.

### ChatGPT and Codex web observation

Record `surface`, `experience`, `plan_control`, `plan_state`, `evidence_source`,
`host_version`, and `confidence` from current host context or user reports.
Official documentation describes possible controls, not this turn's capability.

| Field             | Values                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `surface`         | `web`, `desktop`, `mobile`, `unknown`                                                                  |
| `experience`      | `chat`, `work`, `codex`, `unknown`                                                                     |
| `plan_control`    | `slash_plan_command`, `host_mode_toggle`, `structured_tool`, `user_reported`, `none_proven`, `unknown` |
| `plan_state`      | `active`, `inactive`, `unknown`                                                                        |
| `evidence_source` | `host_runtime_context`, `user_report`, `official_docs_for_this_surface`, `none`                        |
| `host_version`    | string or `unknown`                                                                                    |
| `confidence`      | `observed`, `inferred`, `absent`                                                                       |

ChatGPT Chat/Work uses `experience: chat|work`; Codex web uses `surface: web`
and `experience: codex`. `/goal`, a bundled plan skill, and text requesting
Plan do not satisfy native Plan preflight. Preserve the observation record and
include `host_version` in capability evidence; an unknown version is permitted.

Evaluate these gates in order and stop at the first applicable outcome:

1. **Distinguish routing.** Before every active, web, non-web, refusal, fallback,
   or handoff branch, missing/contradictory routing fields, `surface: unknown`,
   or `experience: unknown` mean `Planning capability: Indeterminate`. Ask for
   the distinguishable value and wait. Do not emit a transition handoff.
2. **Honor an explicit refusal.** If Plan was recommended and the user declined,
   report `Planning capability: Explicitly declined`, record `Plan-mode
fallback: explicitly declined - <user statement>`, and continue
   conversationally. Evaluate this before requiring native-control evidence:
   unknown/missing controls, `evidence_source: none`, and documentation-only
   evidence must not mask the refusal. Do not request Plan again or emit a
   transition handoff. Refusal is separate user evidence, not proof of technical
   unavailability. If the runtime still reports Plan active, the refusal does
   not exit it; keep persistence pending until the host confirms exit.
3. **Wait when a usable composer is still needed.** Unless current evidence
   already proves Plan active, a running turn or temporarily disabled Plan
   control means `Planning capability: Indeterminate`: explain the temporary
   condition, wait for the turn to finish, and re-observe the composer. A
   busy-turn menu cannot establish `none_proven`. An observed active mode still
   passes the evidence gate below and does not need another transition.
4. **Check capability evidence.** For the remaining branches, missing required
   fields, contradictory values, `evidence_source: official_docs_for_this_surface`,
   `evidence_source: none`, or `confidence: inferred` or `confidence: absent` mean
   `Planning capability: Indeterminate`. Ask for current-composer evidence and
   wait without fallback or a transition. In particular, `none_proven` with an
   active state is contradictory. A positive enumeration with
   `plan_state: unknown` is not contradictory when no Plan control exists.
5. **Handle proven absence.** `plan_control: none_proven` from a positive current
   enumeration by the host or user yields `Planning capability: Unavailable`.
   Record `Plan-mode fallback: unavailable - <evidence>` and continue
   conversationally. This precedes unknown-state handling, so
   `plan_state: unknown` does not block a proven-absence fallback.
6. **Keep active Plan.** Observed active Plan yields `Planning capability:
Active`. Continue the read-only interview and do not toggle Plan again.
7. **Confirm an observed control's state.** A native control with
   `plan_state: unknown` yields `Planning capability: Indeterminate`. Ask how to
   confirm the state and wait without fallback or a transition handoff.
8. **Request an observed inactive control.** Report `Planning capability:
Available but inactive`, use the matching handoff below, and wait for
   confirmed activation on the next turn before interviewing.
9. **Stop on remaining uncertainty.** Unknown support/control/state yields
   `Planning capability: Indeterminate`; ask for current evidence and wait.
   A product label, missing Codex Plan reminder, or unobserved `/plan` is not
   fallback authority.

### ChatGPT Chat, Work, or mobile handoff

For ChatGPT web Chat/Work, tell the user to select the observed `/plan` item or
named non-slash native control in the current composer, then wait. Never
generate or copy a `/plan` line for this web lane.

On a non-web ChatGPT surface, select the observed control. When that control is
`slash_plan_command`, standalone `/plan` is a copy-ready option. Put the original
request in a separate continuation prompt unless this composer also proves
inline prompt support. If the skill is not loaded, separately instruct: Open
the `@` menu and select Codex Spec Interviewer. Do not insert `@skill` into the
mode command or describe `/plan Use @codex-spec-interviewer` as official syntax.
For a non-slash control, use its observed/user-reported name without inventing a
slash command. Confirm the next turn's mode instead of treating copied text as
activation.

### Codex web handoff

When this composer exposes an inactive `/plan`, select that item or provide
standalone `/plan`, then use a separate continuation prompt after activation:

```text
Use $codex-spec-interviewer to continue this request: <original request>
```

Only if this same composer also proves inline argument support may the handoff
combine them as `/plan Use $codex-spec-interviewer to continue this request:
<original request>`. Observing `/plan` alone does not prove CLI-style parsing.
For an observed non-slash control, name it and wait. Never infer a web control
from Codex CLI/IDE/desktop or substitute ChatGPT `@` syntax.

### Official mechanism and evidence boundary

Verified against official documentation on 2026-09-08:

- [Developer commands](https://learn.chatgpt.com/docs/developer-commands):
  ChatGPT web has its own composer menu. Codex CLI documents `/plan` with an
  optional inline prompt; `/plan` is temporarily unavailable while Codex works.
  A native CLI transition request therefore waits for the running turn to end.
- [Desktop slash commands](https://learn.chatgpt.com/docs/reference/slash-commands):
  select `/plan` in the app composer to toggle Plan; availability varies. An
  available toggle does not prove it accepts CLI inline arguments.
- [Skills & Plugins](https://learn.chatgpt.com/docs/skills-and-plugins):
  ChatGPT uses `@` skill selection; Codex uses `$`.
- [Plugins](https://learn.chatgpt.com/docs/plugins): bundled skills need a new
  chat/session after installation; the IDE extension does not support plugin
  installation. This does not prohibit separately installed standalone skills.
- [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security):
  sandbox and approval policies are separate controls. Codex documents
  `/permissions` for selecting read-only access; verify the observed control and
  effective permissions rather than inferring enforcement from Plan.

Documentation is not live client proof. Do not claim universal web/mobile Plan
support, activate a mode by prompt text, or change host permissions automatically.

### Codex CLI, IDE extension, or Codex in the ChatGPT desktop app

1. Inspect the host-provided mode context and available tools. Classify the state as `active`, `supported-inactive`, `definitely-unavailable`, or `indeterminate`; treat `indeterminate` as `supported-inactive`, never as fallback authority.
2. If native Plan mode is active, continue the workflow. Use `request_user_input` for material user decisions whenever it is available; otherwise ask one concise question at a time.
3. If native Plan mode is supported but inactive, do not interview, inspect the repository, or write files. Stop the turn with a brief explanation and this copy-ready command, replacing the placeholder with the user's complete original request:

   ```text
   /plan Use $codex-spec-interviewer to continue this request: <original request>
   ```

4. If native Plan mode is definitely unavailable, or the user explicitly declines it after the recommendation, continue with the conversational workflow and record `Plan-mode fallback: unavailable - <evidence>` or `Plan-mode fallback: explicitly declined - <user statement>` in the interview summary. Never treat silence or an unknown mode state as a decline. If mode support or state is indeterminate, use the supported-but-inactive handoff instead of falling back.

The active Plan-mode interview is read-only. It may inspect repository and external evidence, but it must not create, edit, or persist specs, ADRs, documentation, source files, or other files.

## Full workflow

1. Run the native Plan mode preflight above.
2. Classify the requested effort as `compact`, `standard`, or `deep` using the mode table in [spec-rubric.md](spec-rubric.md).
3. Inspect only the minimum repo context needed to avoid low-value questions. During this pass, note spec and ADR destinations by following [artifact-destinations.md](artifact-destinations.md); defer destination confirmation to the final checkpoint unless that reference requires earlier confirmation.
4. Ask one high-impact question at a time when the answer affects the next decision; batch up to 3 questions only when they are independent and low-friction. In active Plan mode, use `request_user_input` whenever available. Prefer answering discoverable questions from repo files, ADRs, code search, MCP tools, or web sources instead of asking the user. Use [question-bank.md](question-bank.md) for question selection.
5. After each answer or evidence pass, summarize the current understanding, explicit assumptions, and remaining unknowns.
6. Continue until every material requirement, non-goal, edge case, validation path, rollout concern, and ADR implication is source-backed, answered by the user, or explicitly accepted as non-blocking.
7. Draft a spec hypothesis, then challenge it against sources using [source-challenge.md](source-challenge.md). Challenge only decisions that materially affect correctness, safety, maintainability, or implementation strategy.
8. Run the ADR gate using [adr-gate.md](adr-gate.md). If a durable architectural decision is required, draft the ADR, identify the required ADR path, and mark implementation blocked until acceptance when the spec depends on that decision.
9. If the challenge invalidates a requirement or prior assumption, revise the spec, mark the conflict, or propose a preceding ADR or spec step before implementation.
10. Present a final checkpoint with scope, non-goals, assumptions, open questions, risks, validation plan, source challenge, ADR result, and artifact path basis. Ask whether anything material is missing or wrong. Pause for an explicit answer when a material decision, ambiguous destination, overwrite, new directory, or ADR write is involved, and continue interviewing if a material gap appears.
11. After the checkpoint is verified, prepare the approved spec from `../assets/spec-template.compact.md`, `../assets/spec-template.standard.md`, or `../assets/spec-template.deep.md`. Convert ambiguous requirements into testable acceptance criteria; prefer EARS-like phrasing when behavior must be testable. For compact specs, use `artifact_path` as the only persisted artifact field.
12. If the user explicitly declined persistence, write no files. Return the full approved spec and any ADR draft in chat, include the companion Codex execution prompt, report `Persistence status: declined`, and state that normal persistence completion was not met.
13. If native Plan mode is active, do not write the approved artifacts. Report `Persistence status: pending Plan-mode exit`, then provide this copy-ready save-only continuation with the approved paths substituted:

    ```text
    Exit Plan mode, then persist the approved spec from this conversation to <spec-path>, any required ADR, and the minimal ADR index entry required by the repository's existing convention. Do not implement the feature. Validate the saved artifacts, emit the companion Codex execution prompt, report the persisted paths, and stop.
    ```

    Stop the turn. This is an approved planning result, not completion of the persistence workflow.

14. On the user's save-only continuation outside Plan mode, persist only the approved spec, any required ADR, and the minimal ADR index entry required by the repository's existing convention. Do not implement the feature or make other repo-facing changes. Validate and report the artifacts, produce the companion Codex execution prompt from `../assets/codex-execution-prompt.md`, and stop.
15. In the documented conversational fallback, save the final spec after checkpoint verification, save an ADR only when the ADR gate requires one, and make the minimal ADR index entry required by the repository's existing convention. If persistence is blocked, return the full save-ready artifact and reason without writing files, include the companion Codex execution prompt, and report normal completion as unmet.
16. Record all repo-facing documentation work other than a convention-required ADR index entry in the spec for later implementation; do not perform it during the Plan interview or save-only continuation.
17. Run a final self-check against [spec-rubric.md](spec-rubric.md).

## Codex integration

- Native Plan mode is host-controlled. On Codex CLI, IDE, or Codex in the ChatGPT desktop app, the skill must request a user-initiated `/plan` transition when supported and inactive; it must not claim to switch modes itself. On ChatGPT Chat, Work, or mobile, follow the ChatGPT lane; on Codex web, follow the observation-gated Codex web lane in this file.
- Use `request_user_input` in active Plan mode when available so material choices require explicit user action.
- Treat the saved spec file as the durable artifact that outlives Plan mode and chat context. An approved in-chat plan with persistence still pending is not the final artifact.
- Treat `AGENTS.md`, `docs/agents/`, and Codex memories as repo and user evidence, not as the artifact format. Do not write spec content into memories or `AGENTS.md` unless the user explicitly asks for it after the tradeoff is stated.

## Safety rules

- Do not invent repo facts, file paths, commands, APIs, or architecture. Mark them as `unspecified` when unknown.
- Do not hide uncertainty. State assumptions explicitly.
- Do not broaden scope beyond what the user asked for; prefer minimal, reversible implementation scope when intent is unclear.
- Do not prescribe destructive migrations, data rewrites, or secret handling without explicit callouts and rollback notes.
- Do not include secrets, credentials, private identifiers, or internal-only data in examples.
- Do not write any file while native Plan mode is active.
- Do not implement the feature during the save-only persistence continuation.
- Do not use an ambiguous destination, overwrite existing files, create new artifact directories, or write ADR files without confirmation.
- Do not use web or MCP lookup as ceremony. Use it when current facts can materially change the spec, and prefer official documentation, primary sources, repo-local docs, and source code over secondary commentary.
- Follow [adr-gate.md](adr-gate.md) for when ADRs must and must not be created. Do not silently override an existing ADR; propose a superseding ADR when a durable decision changes.

## Output format

Every preflight response includes `Planning capability:` and `Read-only enforcement:`
with independent scope/evidence. Include these lines before the native Codex
transition explanation, ChatGPT select/wait response, Codex web handoff, or
fallback result. Apply the ordered gates and surface-specific handoffs above;
do not infer read-only enforcement from a Plan label or emit an unsupported
combined command. Repeat or update both evidence lines in the verified-checkpoint
and final result when their state changes.

After a verified checkpoint in active Plan mode, return in this order:

1. Interview summary and verification result
2. Assumptions and unresolved questions
3. Source challenge summary
4. ADR gate result and proposed ADR path when needed
5. Approved spec path and concise summary
6. `Persistence status: pending Plan-mode exit`
7. Copy-ready save-only continuation

Do not claim persisted paths or normal completion, and do not emit the implementation execution prompt before the save-only continuation completes. The exception is an explicit persistence decline, which returns the full save-ready artifacts and execution prompt in chat with completion reported as unmet.

After persistence, or in a non-Plan fallback, return in this order:

1. Persisted artifact paths
2. Interview summary and verification result
3. Assumptions and unresolved questions
4. Source challenge summary
5. ADR gate result
6. ADR draft or path when needed
7. Saved spec path plus a concise summary, or full save-ready markdown when file persistence is blocked
8. Codex execution prompt
9. Validation commands
10. Risk and rollout notes

Do not paste the full final spec or ADR by default after they are saved. Print full artifact contents only when the user asks, when the environment cannot write files, or when the user needs a review before approval.

## Completion criteria

- The final artifact is a concrete markdown spec, not a prose brainstorm or chat-only plan.
- The spec has explicit scope, constraints, validation, and done-when criteria, and acceptance criteria are testable.
- The spec is saved in the repository with a reported path. An approved spec that is still pending Plan-mode exit is not complete.
- Required ADRs are saved using the repo's ADR path and filename pattern, or implementation is explicitly blocked before ADR creation.
- Missing facts are labeled as `unspecified`, and no unresolved blocking decision is hidden as a non-blocking assumption.
- Important requirements and implementation decisions were challenged against relevant repo evidence and current sources, or the reason for skipping the challenge is stated.
- A required ADR is indexed during save-only persistence when the repository convention requires it; all other repo-facing documentation changes are captured in the implementation spec for later work.
- A Codex execution prompt is included.
- The save-only continuation performs no feature implementation or unrelated repository changes; a minimal convention-required ADR index entry is related ADR persistence.

## Failure modes

- If the repository context is unavailable, produce a repo-agnostic spec and mark repo-specific details as `unspecified`.
- If native Plan mode is supported but inactive on Codex CLI, IDE, or Codex in the ChatGPT desktop app, stop with the preflight's copy-ready `/plan` command; do not silently fall back.
- If native Plan mode is definitely unavailable on Codex CLI, IDE, or Codex in the ChatGPT desktop app, or the user explicitly declined it, record the fallback reason and continue conversationally.
- If the host lane is ChatGPT Chat, Work, or mobile, follow the ChatGPT lane above. Conversational fallback on that lane is allowed only when `plan_control` is `none_proven` from a positive enumeration, or the user explicitly declined Plan. Do not report `Planning capability: Unavailable` from ChatGPT identity, missing Codex Plan state, or a missing `/plan` slash.
- If the host lane is Codex web, follow the Codex web lane above. Conversational fallback is allowed only after a positive enumeration proves no Plan control or the user explicitly declines Plan; missing or contradictory evidence remains `Planning capability: Indeterminate`.
- If the user remains in Plan mode after approving the checkpoint, keep persistence marked pending, repeat the save-only handoff if useful, and do not claim completion.
- If a save-only continuation lacks enough conversation context to reproduce the approved artifact exactly, stop and ask the user to resume the original conversation or provide the approved artifact; do not invent missing content.
- If the user's goal is internally inconsistent, stop and surface the conflict clearly.
- If validation commands cannot be determined, include a placeholder section labeled `unspecified`.
- If the requested scope is too large for one safe spec, split it into phases and say so.
- If the user declines persistence or a save is blocked, return the spec and any ADR draft in chat with the proposed path and the blocker, and report that normal persistence completion was not met.
- If a proposed artifact path already exists, ask before overwriting it.
- If current external docs cannot be reached, continue with repo evidence and mark the external-source check as unavailable.
- If a prior ADR or named requirement appears stale or wrong, propose a preceding ADR, spec update, or explicit maintainer decision instead of silently overriding it.
- If the ADR gate is uncertain, produce the spec with `ADR required: unresolved` and make implementation blocked on a maintainer decision.
- If the checkpoint is not verified, keep interviewing or stop with the spec uncreated.
- If the specs or ADR folder does not exist and the user does not approve creating or selecting one, stop before creating final artifacts.
