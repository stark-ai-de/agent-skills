# Native Plan Mode Lifecycle

## Should Trigger

Yes.

## Runtime Context

- Native Codex Plan mode is active.
- `request_user_input` is available.
- The repository has an existing `docs/specs/` convention and no destination conflict.

## Prompt

Use $codex-spec-interviewer to define a safe migration from our legacy webhook worker to the new queue-backed worker. Interview me before any files are changed.

## Deterministic Assertions

- contains: request_user_input
- contains: Persistence status: pending Plan-mode exit
- contains: Exit Plan mode
- contains: Do not implement the feature

## Expected Behavior

- Recognize that native Plan mode is already active and do not ask the user to invoke `/plan` again.
- Use `request_user_input` for each material preference when available, normally one high-impact question at a time.
- Inspect repository and current-source evidence read-only; create or edit no files during the interview.
- Cover migration scope, compatibility, failure handling, rollout, rollback, validation, and the ADR gate before presenting the final checkpoint.
- After explicit checkpoint verification, report the approved spec, any required ADR, and any convention-required ADR index paths plus `Persistence status: pending Plan-mode exit`.
- Provide a copy-ready save-only continuation that tells the user to exit Plan mode, persist only the approved spec, required ADR, and convention-required minimal ADR index entry; validate them; emit the Codex execution prompt; and stop without implementing the migration.
- Treat the Plan-mode result as persistence-pending, not complete.
- On the subsequent non-Plan continuation, write only the approved artifacts, report their paths and validation, emit the execution prompt, and stop.
