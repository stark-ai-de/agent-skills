# Native Plan Explicitly Declined Fallback

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to decide ownership of a proposed shared billing
package. Native Plan mode is available, but I explicitly decline entering it for
this request. Do not ask again. Keep the architecture decision conversational
and read-only, and do not implement anything. Native Plan mode is supported but
inactive, and my refusal is explicit in this turn. Read-only enforcement is
unavailable, so preserve read-only behavior with the portable gate.

## Deterministic Assertions

- contains: Planning capability: Explicitly declined
- contains: Read-only enforcement: unavailable
- contains: Plan-mode fallback: explicitly declined
- contains: Architecture decision status: pending
- contains: Execution status: not requested
- contains: shared billing package

## Expected Behavior

- Activate and treat package ownership as an unresolved durable decision.
- Quote or faithfully summarize the current-turn refusal after
  `Plan-mode fallback: explicitly declined -` and do not repeat the transition
  request.
- Record the unavailable read-only enforcement separately from planning
  capability and preserve the behavioral no-write gate.
- Ask only the material ownership questions, perform no repository, index,
  artifact, or external-state writes, and return pending/not-requested statuses.
