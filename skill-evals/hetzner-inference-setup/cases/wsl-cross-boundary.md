# WSL Cross-Boundary Route

## Should Trigger

Yes.

## Prompt

Run LiteLLM in WSL but automatically write Windows Codex and Cursor settings to use it over localhost.

## Deterministic assertions

- identifies WSL as a distinct boundary
- defaults gateway and clients to the same WSL distribution
- requires fresh reachability evidence for any cross-boundary route
- still blocks other-OS mutation in this baseline
- does not write under `/mnt/c`, Windows profiles, or opaque Cursor state

## Expected behavior

Recommend running the client in WSL with the gateway. Explain that verified reachability alone does not grant ownership of Windows configuration.
