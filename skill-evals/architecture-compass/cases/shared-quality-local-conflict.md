# Shared Quality Respects Accepted Local Tooling

## Should Trigger

Yes.

## Prompt

An existing repository has an Accepted ADR requiring a framework-specific ESLint processor that currently handles source unsupported by its installed Oxlint. The user asks Architecture Compass to adopt the shared policy and prepare a migration plan, but has not approved replacing that local decision.

## Deterministic Assertions

- contains: AC-ADR-069
- contains: accepted
- contains: conflict
- contains: successor
- contains: compatibility
- contains: owner
- not_contains: remove the existing linter now
- not_contains: provider overrides local

## Expected Behavior

Name the exact local conflict, retain current required coverage, and prepare a bounded adaptation/successor and compatibility evidence before replacement. The shared package is the required intended policy within an accepted adoption scope; unresolved syntax cannot be hidden by broad ignores or declared fully adopted. Preserve independent package/compiler/runtime authority and stop only the dependent replacement.

## Evidence Stage

source/static: this case specifies expected agent behavior. A structural pass does not establish a live agent run, installation or hosted enforcement.
