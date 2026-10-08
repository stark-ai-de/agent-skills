# Shared Code Requires Equivalent Consumers

## Should Trigger

Yes.

## Prompt

The user authorized an ADR-governed simplification of two services and their tests. Two services contain identical copies of a pure field-path mapper and already consume the same runtime-neutral contract module. A browser validator and a privileged server validator look similar, but only the latter imports credential-bearing configuration and enforces ownership. A public DTO shape check intentionally compares the schema to an independently declared supported contract. Two fixtures differ in lifecycle state. A wrapper enforces a supported package entrypoint. Reduce duplication where appropriate without expanding the approved boundaries.

## Deterministic Assertions

- contains: runtime-neutral
- contains: field-path mapper
- contains: ownership
- contains: public DTO
- contains: lifecycle state
- contains: supported package entrypoint
- not_contains: create a generic validation framework

## Expected Behavior

- Select bounded refactor after verifying accepted local governance and all affected consumers.
- Consider the existing runtime-neutral owner for the identical mapper; count the shared helper/import changes and prove both consumers. Avoid a speculative package or options-heavy abstraction.
- Keep privileged dependencies and ownership checks out of browser-reachable code. Similar syntax does not prove equivalent behavior or runtime audience.
- Retain independent public-contract drift checks, distinct lifecycle fixtures, and the wrapper's supported entrypoint guarantee. An internal inferred type is a different candidate from an intentional independent public contract.
- Record rejected candidates with their semantic reasons and continue looking for qualifying reductions within scope.
