# Shared Quality Audit Rejects Unsupported Completion Claims

## Should Trigger

Yes.

## Prompt

Audit a repository that claims shared quality is complete. Its dependency uses the mutable main branch, the config imports only core, CI writes the baseline before comparing it, and the only receipt is a local passing command with no failing-source example. No writes are authorized.

## Deterministic Assertions

- contains: audit
- contains: AC-ADR-069
- contains: immutable
- contains: strict
- contains: modularity
- contains: anti-slop
- contains: baseline
- contains: CI
- not_contains: fully verified
- not_contains: updated the baseline

## Expected Behavior

Rank findings for mutable source identity, missing mandatory presets/formatter verification, automatic baseline absorption and inadequate enforcement evidence. Require a full retained Git SHA or exact reviewed release, compatible tools, real passing/failing examples and frozen installation. Report local versus hosted proof and missing prerequisites without patching files or running installation/repair.

## Evidence Stage

source/static: this case specifies expected agent behavior. A structural pass does not establish a live agent run, installation or hosted enforcement.
