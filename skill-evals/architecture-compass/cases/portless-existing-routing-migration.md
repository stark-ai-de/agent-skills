# Existing Equivalent Routing Migration

## Should Trigger

Yes.

## Prompt

Plan the next authorized local-development workflow change. The repository already has a reliable named HTTPS reverse proxy, with no accepted ADR requiring that product. Is equivalent behavior enough to keep it forever?

## Deterministic Assertions

- contains: AC-ADR-065
- contains: migration
- contains: revisit
- contains: authorized

## Expected Behavior

Treat the existing proxy as a migration candidate at the next suitable authorized change. Equivalence alone is not a permanent exemption. Inventory callback/origin and trust requirements, qualify replacement before retiring the existing route owner, and retain recovery. A concrete technical blocker records evidence, an owner and a revisit trigger; unrelated work does not trigger immediate replacement.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
