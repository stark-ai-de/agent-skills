# Declined Persistence

## Should Trigger

Yes.

## Prompt

Interview me and produce a proper spec for migrating our session storage to Redis, but do not write any files - just give me everything in chat.

## Expected Behavior

- Activate `codex-spec-interviewer` and run the full interview, source challenge, and ADR gate.
- Respect the explicit persistence decline: write no spec or ADR files.
- Return the complete final spec and any ADR draft in chat, including the path that would have been used.
- Still include the verification checkpoint, validation commands, and a Codex execution prompt.

Explicit chat-only delivery is a completed requested outcome: report `Persistence status: not requested`, do not ask for a save path, and do not label it incomplete merely because no file was saved.
