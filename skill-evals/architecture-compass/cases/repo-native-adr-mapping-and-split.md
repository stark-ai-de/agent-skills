# Repository-native ADR Mapping and Split

## Should Trigger

Yes.

## Prompt

The clear governance request selected `setup/recommended`. The target
uses ADR-0041 through ADR-0048. Accepted ADR-0044 combines the binding-agent rule
from AC-ADR-005 with a repository-only deployment decision and differs in one
constraint. Preserve accepted history while adopting the provider decision.

## Deterministic Assertions

- contains: AC-ADR-005 ->
- contains: repository-native
- contains: split
- contains: successor
- contains: repository-only
- contains: accepted ADR-0044
- not_contains: overwrite ADR-0044

## Expected Behavior

- Allocate the next repository-native IDs rather than copying AC numbering.
- Preserve accepted ADR-0044 and use reciprocal successor/split records under
  the target convention.
- Keep the AC-ADR-005 decision independently discoverable and keep the
  deployment-only decision in a separate local ADR.
- Route the differing constraint through explicit adaptation or the configured
  local/host-matched spec interviewer before affected writes continue.
