# Native Plan Mode Lifecycle

## Should Trigger

Yes.

## Prompt

Use `$cursor-spec-interviewer` to turn my rough audit-log feature idea into a Cursor-ready implementation spec. Cursor Plan Mode is available, but it is not active yet.

## Expected Behavior

- Preserve native Plan after Cursor confirms activation and inspect relevant evidence read-only. When Plan is inactive, continue permitted read-only interview work without treating it as active. Ask only unresolved material questions using an available permitted tool or conversation.
- Prepare the complete spec and any required ADR/index content before one positive checkpoint naming exact paths and writes.
- Use the native plan approval as that checkpoint when it actually covers the draft and save scope; otherwise retain the explicit chat approval across the required exit.
- When Plan mode became active, report `Persistence status: pending Plan-mode exit` until actual exit. When Plan mode stayed inactive, do not require a pending exit. Never write or claim a save while Plan is active.
- After host exit and known write permissions, save only approved artifacts without asking content/save approval again. Read back, report paths, emit the target execution prompt, and finish the interviewer handoff.
- Do not implement the feature inside the interviewer; separately authorized outer work may then resume.
