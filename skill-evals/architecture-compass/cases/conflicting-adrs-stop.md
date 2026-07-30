# Architecture Evidence Ranking and Conflicting Accepted ADR Stop

## Should Trigger

Yes.

## Prompt

Set up recommended ADR governance for this existing repository. ADR-0004 says
browser writes use Server Actions, while accepted ADR-0011 says all browser
writes use API routes. There is no supersession metadata. A canonical target
guide, an ADR-linked approved example, current code, an adoptable provider ADR,
and framework documentation also disagree. Apply AC-ADR-046, refresh only
unaffected governance artifacts, and do not choose or mix a winner.

## Deterministic Assertions

- contains: Selected workflow: setup
- contains: AC-ADR-046
- contains: ADR-0004
- contains: ADR-0011
- contains: accepted target ADRs
- contains: canonical target documentation
- contains: ADR-linked approved examples
- contains: consistent current implementation
- contains: adoptable provider decisions
- contains: framework defaults
- contains: operational authority unchanged
- contains: affected scope
- contains: Architecture decision status: blocked
- contains: Execution status: blocked
- contains: accepted successor or maintainer resolution
- not_contains: selected a winner
- not_contains: Decision: mixed compromise

## Expected Behavior

- Select setup from clear intent and use AC-ADR-046 without treating the
  workflow selection or write request as expanded architecture authority.
- Rank applicable accepted or superseding target ADRs first, followed by
  canonical target documentation, ADR-linked approved examples, consistent
  current implementation, adoptable provider decisions, and framework
  defaults.
- Because the two applicable accepted ADRs conflict at the highest rank, report
  both sources and the affected write boundary, then stop only that scope until
  an accepted successor or maintainer resolution establishes precedence.
- Do not blend contradictory sources or use code, numbering, provider advice,
  or framework defaults to silently choose a winner. Unaffected, already
  authorized governance refresh work may continue.
