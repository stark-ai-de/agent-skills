# cursor-spec-interviewer rubric

Grade actual conversation and artifact evidence; a static case inventory is not a behavioral pass. Historical `runs/` remain dated evidence of their original contract.

## Trigger and target fit

- Use for ambiguous coding requirements/spec work, including Cursor Agent-targeted requests; avoid fully specified direct implementation, tiny edits, pure brainstorming and memory cleanup.
- The current execution host supplies controls; the target Cursor Agent runtime supplies relevant evidence and the execution prompt. Do not redirect merely because another interviewer is installed.
- A clear task selects this single workflow. A bare activation asks for the task, without invented review/save variants.

## Interview quality

- Resolve discoverable facts from source and reuse prior answers. Ask real unresolved material questions; do not substitute a one-shot inferred plan for needed back-and-forth.
- Preserve scope, non-goals, source challenge, testable criteria, concrete validation, rollout and ADR gates.
- Use only available planning/question capabilities. Active Plan stays read-only; inactive, unavailable or indeterminate controls do not block permissible discovery/conversation. Unknown write state blocks persistence.
- Explicit refusal is honored. Async pending answers allow only independent authorized work; silence, timeouts and preselected values are not answers.

## One checkpoint and truthful delivery

- Prepare the complete reviewable draft and exact concrete writes before approval; include outstanding path, directory, overwrite and ADR/index decisions in that checkpoint.
- One positive approval covers unchanged content and named writes. A native plan approval can be that checkpoint. A mode toggle alone does not approve content.
- Preserve approval across actual host exit. Ask only affected deltas after material content/scope/path/target-state changes. Bounded “change A and save” needs no automatic extra review cycle.
- Separate Proposed ADR persistence from explicit decision acceptance; retain prior exact acceptance and keep dependent implementation blocked when unresolved.
- Save-only finalization writes only approved spec/ADR/minimal index artifacts and reads them back. Report pending, failed and partially successful writes accurately.
- Explicit chat-only delivery returns full content and the target execution prompt and completes the requested outcome without claiming persistence.
- The interviewer never implements the feature; separately authorized outer work may resume after its handoff.

## Evaluation method

Run the [shared approval scenarios](../codex-spec-interviewer/approval-scenarios.json) for this target with fixed answer cards and actual conversation continuation. Count material versus duplicate questions, skill-generated versus native host prompts, unapproved writes and truthful completion. Require no lost material decision, no duplicate approval of an unchanged result, and no unauthorized writes. Include older-host, unknown-host and denied-write arms.

Static checks cover portable metadata, resolvable local references, template record uniqueness and scenario inventory only. They do not prove live decisions, native UI transitions or another client's behavior.
