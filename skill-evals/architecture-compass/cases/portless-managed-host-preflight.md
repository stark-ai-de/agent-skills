# Managed Host Preflight

## Should Trigger

Yes.

## Prompt

A NixOS-owned Portless proxy has an explicit state directory. A repository launcher inherits stale LAN/TLD settings and the configured service is missing or mismatched. Diagnose and define a safe start boundary without repairing shared host configuration.

## Deterministic Assertions

- contains: AC-ADR-066
- contains: PORTLESS_SYNC_HOSTS=0
- contains: doctor
- contains: pending

## Expected Behavior

Select the same owned state directory and qualified TLS/port/TLD inputs in service and clients. Disable automatic hosts synchronization, LAN and sharing. Inspect doctor, list and the actual service owner status; compare persisted/running settings before delegation. Ordinary commands can auto-start and warn rather than reject configuration mismatch, and can clean shared orphan process groups. Stop on missing/mismatched prerequisites or unqualified foreign-process isolation; leave host repair pending with its owner. Do not hide installation, trust repair or global cleanup in repository startup. Doctor does not prove every client trust store.

## Evidence Stage

source/static: this is an evaluation contract, not an observed agent turn or
target runtime qualification. Keyword checks complement semantic review.
