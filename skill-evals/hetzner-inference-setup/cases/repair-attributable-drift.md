# Repair Attributable Drift

## Should Trigger

Yes.

## Prompt

Status reports one modified owned Codex profile. Repair it, but do not reinstall the runtime or touch credentials.

## Deterministic assertions

- selects repair
- requires exact current drift digest
- plan contains no LiteLLM install approval
- backs up only the current non-secret manifest-owned profile
- preserves runtime and both credentials
- rejects runtime, credential, redirected-path, or unexpected-entry drift

## Expected behavior

Create a new bounded repair plan and apply only after exact plan approval. Revalidate before backup/write and invalidate client evidence.
