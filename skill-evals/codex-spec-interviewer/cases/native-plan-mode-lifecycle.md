# Native Plan Mode Lifecycle

## Should Trigger

Yes.

## Runtime Context

- Native Codex Plan mode is active.
- `request_user_input` is available.
- The repository has an existing `docs/specs/` convention and no destination conflict.

## Prompt

Use $codex-spec-interviewer to define a safe migration from our legacy webhook worker to the new queue-backed worker. Interview me before any files are changed.

## Expected Behavior

- Preserve active native Plan and inspect relevant evidence read-only. Ask only unresolved material questions using an available permitted tool or conversation.
- Prepare the complete spec and any required ADR/index content before one positive checkpoint naming exact paths and writes.
- Use the native plan approval as that checkpoint when it actually covers the draft and save scope; otherwise retain the explicit chat approval across the required exit.
- Report `Persistence status: pending Plan-mode exit` until actual exit; never write or claim a save in Plan.
- After host exit and known write permissions, save only approved artifacts without asking content/save approval again. Read back, report paths, emit the target execution prompt, and finish the interviewer handoff.
- Do not implement the feature inside the interviewer; separately authorized outer work may then resume.
