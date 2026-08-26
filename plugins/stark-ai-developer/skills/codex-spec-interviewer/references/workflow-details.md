# Codex Spec Interviewer workflow details

Read this reference when running the full interview, persistence, or output workflow from `SKILL.md`. The main skill file is the concise entrypoint; this file contains the detailed gates and failure handling.

## Native Plan mode preflight

Run this preflight before substantive interviewing or repository exploration. A skill cannot change the host's collaboration mode during an active turn, and the user's use of the word "plan" does not prove that native Plan mode is active.

Identify the host lane from host_runtime_context before classifying Plan support.

- Codex CLI, Codex IDE extension, or Codex in the ChatGPT desktop app: run steps 1–4 below. Do not require ChatGPT observation fields. Missing slash-menu dump is not proof that `/plan` is absent on this lane.
- Codex web: run the Codex web lane below and stop. Do not run steps 1–4. Do not infer its Plan control or state from Codex CLI, IDE, or desktop. Emit a slash Plan handoff only when the current composer visibly exposes `/plan` and `plan_control` is `slash_plan_command`.
- ChatGPT Chat, Work, or mobile (not the Codex desktop experience or Codex web): run the ChatGPT lane below and stop. Do not run steps 1–4. Do not emit `/plan Use $codex-spec-interviewer`. Emit a slash Plan command only when `surface` is not `web` and `plan_control` is `slash_plan_command`.
- Any other or unknown host: report `Planning capability: Indeterminate`, ask which host and Plan control exist, and wait. Do not emit `/plan Use $codex-spec-interviewer`. Do not claim ChatGPT has no Plan.

### ChatGPT Chat, Work, or mobile

Fill a ChatGPT observation record from `host_runtime_context`, `user_report`, or `official_docs_for_this_surface` only: `surface`, `experience`, `plan_control`, `plan_state`, `evidence_source`, `host_version`, `confidence`. The shared record uses these values:

| Field             | Values                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `surface`         | `web` \| `desktop` \| `mobile` \| `unknown`                                                                      |
| `experience`      | `chat` \| `work` \| `codex` \| `unknown`                                                                         |
| `plan_control`    | `slash_plan_command` \| `host_mode_toggle` \| `structured_tool` \| `user_reported` \| `none_proven` \| `unknown` |
| `plan_state`      | `active` \| `inactive` \| `unknown`                                                                              |
| `evidence_source` | `host_runtime_context` \| `user_report` \| `official_docs_for_this_surface` \| `none`                            |
| `host_version`    | string or `unknown`                                                                                              |
| `confidence`      | `observed` \| `inferred` \| `absent`                                                                             |

For ChatGPT Chat, Work, or mobile, use `experience: chat|work`; Codex web uses
`experience: codex`. Official docs do not prove the current composer, Plan
control, Plan state, or unavailability.
`slash_plan_command` is one evidence field; a missing `/plan` slash does not
prove Plan is absent. `/goal` does not satisfy Plan preflight. The bundled plan
skill does not satisfy Plan preflight. Work may expose a non-slash Plan control.
Mobile with an incomplete record is `Planning capability: Indeterminate`, not
fallback. Include `host_version` in the evidence; do not use `host_version` or
official docs to prove Active or Unavailable.

On this lane only, missing required fields, `evidence_source:
official_docs_for_this_surface`, `evidence_source: none`, contradictory fields,
or `confidence: inferred` for `plan_control` or `plan_state` means `Planning
capability: Indeterminate`: ask whether Plan is available and how to enter it,
then wait. Do not fall back. Do not emit a slash Plan command. A current
`host_runtime_context` or `user_report` may establish observed control/state
evidence.

Then:

- If Plan is observed active, report `Planning capability: Active` and continue the read-only interview.
- If a native Plan control is observed but `plan_state` is `unknown`, report `Planning capability: Indeterminate`, ask whether Plan is active and how to confirm it, then wait. Do not fall back or emit a handoff from an unknown state.
- If `surface` is `web`, `experience` is `chat` or `work`, and a `/plan` control is observed but inactive, report `Planning capability: Available but inactive`, tell the user to select the observed `/plan` item in the current composer, and wait. Do not generate or copy a `/plan` line for ChatGPT web Chat or Work.
- If `surface` is `web`, `experience` is `chat` or `work`, and an observed native Plan control is non-slash and inactive, report `Planning capability: Available but inactive`, describe that control, and wait. Do not generate a slash command.
- If a native Plan control is observed and inactive on a non-web surface, report `Planning capability: Available but inactive`, hand off that control, and wait. Emit a slash Plan command only when `plan_control` is `slash_plan_command`: copy-ready `/plan` with optional inline continuation text of the original request. Do not insert `@skill` into that command. If the skill is not already loaded, add a separate instruction: Open the `@` menu and select Codex Spec Interviewer. For a non-slash control, describe the observed or user-reported name and do not emit a slash Plan command.
- If Plan support or state is unknown, or the only evidence is ChatGPT identity or missing Codex Plan state, report `Planning capability: Indeterminate`, ask whether Plan is available and how to enter it, and wait. Do not record a conversational fallback from that evidence. Do not emit a slash Plan command.
- Report `Planning capability: Unavailable` and continue conversationally only when `plan_control` is `none_proven` from a positive enumeration of controls with no Plan control, or the user explicitly declined Plan. Record `Plan-mode fallback: unavailable - <evidence>` or `Plan-mode fallback: explicitly declined - <user statement>`.

Do not claim `/plan Use @codex-spec-interviewer` is official ChatGPT syntax.

### Codex web

Fill the same observation record for `surface: web`, `experience: codex`, using only `host_runtime_context`, `user_report`, or `official_docs_for_this_surface`. Official client documentation establishes that Codex web exists, but does not prove the current composer’s Plan control or state. Plugin availability is separate; the current official [Plugins reference](https://learn.chatgpt.com/docs/plugins) says the Codex IDE extension does not support plugins, so this workflow does not promise plugin browsing or installation in an IDE.

On this lane, an `official_docs_for_this_surface` source or `confidence:
inferred` for `plan_control` or `plan_state` is insufficient for classification.
Report `Planning capability: Indeterminate`, ask for current-composer evidence,
and wait. Do not use documentation-only evidence for `Active`, `Available but
inactive`, or `Unavailable`.

- If Plan is observed active, report `Planning capability: Active` and continue the read-only interview.
- If a native Plan control is observed but `plan_state` is `unknown`, report `Planning capability: Indeterminate`, ask how to confirm the state, and wait. Do not fall back or emit a handoff.
- If `/plan` is observed and inactive, report `Planning capability: Available but inactive`, and emit this copy-ready handoff with the original request substituted:

  ```text
  /plan Use $codex-spec-interviewer to continue this request: <original request>
  ```

  This handoff is allowed only because the current Codex web composer exposed `/plan`; do not use the ChatGPT `@` syntax or the ChatGPT web select-only response.

- If an observed non-slash Plan control is inactive, report `Planning capability: Available but inactive`, describe the observed control, and wait. Do not emit a generated slash command.
- If the current composer positively enumerates controls without Plan, report `Planning capability: Unavailable` and continue conversationally with the recorded fallback evidence.
- If the control or state is missing, contradictory, or only inferred, report `Planning capability: Indeterminate`, ask for current composer evidence, and wait. Do not fall back or emit `/plan Use $codex-spec-interviewer`.

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

When supported native Plan mode is inactive on Codex CLI, IDE, or Codex in the ChatGPT desktop app, return only the brief transition explanation and copy-ready `/plan` command from the preflight. On ChatGPT Chat, Work, or mobile, return the ChatGPT lane's `Planning capability:` label and its switch, wait, or ask handoff. Do not emit `/plan Use $codex-spec-interviewer` on that lane. On Codex web, emit the copy-ready handoff only when the current composer visibly exposes `/plan`; otherwise return the Codex web lane's wait or fallback result. Emit a slash Plan command for the web surface only when `experience` is `codex` and `plan_control` is `slash_plan_command`.

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
