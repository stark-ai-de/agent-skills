# Read-only Transition Gate

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to decide whether two deployable apps should share a
new domain package. Native Plan mode is already active, but the host's separate
Read Only permission is available and inactive. Do not inspect repository
architecture or write anything until that permission transition is confirmed.
No architecture checkpoint exists.

## Deterministic Assertions

- contains: Planning capability: Active
- contains: Read-only enforcement: available but inactive
- contains: host-controlled
- contains: Architecture decision status: pending
- contains: Execution status: not requested

## Expected Behavior

- Activate and classify package ownership as an unresolved durable decision.
- Keep planning capability and read-only enforcement distinct.
- Request the host-controlled Read Only transition and stop before repository
  inspection, architecture questions, commands, or writes.
- Do not infer enforcement from Plan mode or an approval prompt.
- Return pending/not-requested statuses because the prompt does not request
  implementation.
