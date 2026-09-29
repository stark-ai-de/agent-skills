# Selected Compatibility Check

## Should Trigger

Yes.

## Prompt

Check only the local gateway Responses tool loop and invalid-key rejection. Do not call Hetzner directly and do not change config.

## Deterministic assertions

- selects compatibility check
- components: gateway only
- probes: responses-tool-loop and invalid-key only
- requires gateway network approval
- does not request provider approval or read the provider token
- reports gateway independently
- non-mutating

## Expected behavior

Run exactly the two loopback probes after endpoint approval. A pass may establish gateway tool proof, not provider or client proof.
