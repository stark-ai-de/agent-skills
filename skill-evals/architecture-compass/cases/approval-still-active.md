# Approved Result Waits Only For Mode Exit

## Should Trigger

Yes.

## Prompt

Revision A and its named save actions are explicitly approved. Native Plan remains active; permissions would otherwise allow writes. Continue the approved save-only delivery.

## Deterministic Assertions

- contains: approval retained
- contains: Execution status: pending Plan-mode exit
- not_contains: Persistence status: completed
- not_contains: approve revision A again

## Expected Behavior

Do no mutation. Preserve the approved version and wait only for a real host transition; a prompt cannot exit Plan.
