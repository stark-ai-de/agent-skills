# Ambiguous model creation

## Should Trigger

Yes.

## Prompt

The add-model request timed out. Run it again; I do not know whether the server saved it.

## Expected behavior

- Reconcile the saved plan attempt by exact model ID, owner marker and non-secret configuration.
- Do not blindly retry POST or infer ownership from an alias.
- Preserve uncertain state for an operator when attribution is unresolved.
