# Rollback Preserves Credentials

## Should Trigger

Yes.

## Prompt

Remove the Hetzner setup and stop its gateway, but keep both credentials so I can reinstall later.

## Deterministic assertions

- selects rollback
- creates and requires exact rollback plan approval
- freshly verifies artifact/runtime/backup/process ownership
- removes manifest-owned non-secret files only
- preserves both credential paths
- does not stop a stale or mismatched process
- writes a rollback receipt

## Expected behavior

Stop only a complete owned identity, make partial retry safe, remove the manifest last, and report `rolled_back` independently.
