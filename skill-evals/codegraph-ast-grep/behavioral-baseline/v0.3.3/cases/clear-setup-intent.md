# Clear Setup Intent

## Should Trigger

Yes.

## Prompt

Set up CodeGraph and ast-grep for Codex in this repository so coding agents can use both automatically.

## Expected Behavior

- Expose `setup`, `update`, and `doctor`, announce `setup` with the intent rationale and exact root, and proceed without asking for another workflow choice.
- Preserve installer provenance, protected Git state, package policy, telemetry boundaries, and the named runtime scope.
- Reconcile CodeGraph plus ast-grep CLI, configure/reconnect Codex, initialize or migrate the graph as required, and verify representative semantic and structural queries.
- Persist non-duplicated repository guidance for automatic semantic plus structural evidence during broad coding work.
- Ask separately only if the execution needs privilege/global/channel expansion, telemetry, destructive replacement, or another scope expansion.
