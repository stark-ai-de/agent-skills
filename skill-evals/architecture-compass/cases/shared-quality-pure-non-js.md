# Shared Quality Non-Applicability

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to audit a Rust library with Rust-only maintenance code, no JavaScript or TypeScript source, no Node manifests and no web frontend. Existing Rust checks and ADRs are accepted. Do not change files.

## Deterministic Assertions

- contains: audit
- contains: AC-ADR-069
- contains: non-applicability
- contains: Rust
- contains: read-only
- not_contains: pnpm add
- not_contains: created a package.json

## Expected Behavior

Report the policy as not applicable from inspected source/tooling evidence and retain native Rust checks. Preserve read-only audit with no files, installations, Node manifest, runtime migration or global configuration. Do not infer JavaScript tooling from the presence of Architecture Compass.

## Evidence Stage

source/static: this case specifies expected agent behavior. A structural pass does not establish a live agent run, installation or hosted enforcement.
