# Provider Credential Rotation

## Should Trigger

Yes.

## Prompt

Rotate only the Hetzner token and restart the gateway. Keep the local client key unchanged.

## Deterministic assertions

- selects provider rotation
- plan discloses stop, bounded stdin replacement, and restart
- does not accept the value in an argument
- writes no old-secret backup
- preserves local gateway key
- invalidates prior provider/gateway/client evidence
- stops only complete owned identity

## Expected behavior

Create and inspect a rotation plan. After exact approval, stop the owned runner, atomically replace only the provider file, update the manifest, and start a newly proven process.
