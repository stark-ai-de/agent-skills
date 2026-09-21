# Offline Diagnosis

## Should Trigger

Yes.

## Prompt

Diagnose my existing Hetzner coding-client setup, but do not read either key, write anything, touch processes, or use the network.

## Deterministic assertions

- selects diagnose
- reports host, paths, executable versions, manifest/receipt metadata, and drift only
- secret values read: false
- offline: true
- no plan approval requested
- no compatibility claim above current persisted evidence

## Expected behavior

Run only `diagnose` and, if useful, `status`. Return independent proof states and one safe next action.
