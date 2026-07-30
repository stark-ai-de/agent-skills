# Skill Portability Taxonomy

## Should Trigger

Yes.

## Prompt

The Architecture Compass checkpoint was shown and the user explicitly confirmed
`setup/recommended` for a public skill repository. Classify these three
capabilities before naming or placing them:

1. A curator that reads and changes one agent's proprietary persistent memory.
2. A shared interviewing capability whose supported hosts require materially
   different activation, planning lifecycle, persisted artifact, and execution
   handoff contracts.
3. An ADR workflow with the same trigger, target evidence, safety boundary, and
   output on every host, while only planning and question controls differ.

## Deterministic Assertions

- contains: AC-ADR-035
- contains: agent-bound skill
- contains: portable capability with optimized host variants
- contains: one portable skill with host adapters
- contains: materially different
- not_contains: duplicate every skill per host

## Expected Behavior

- Classify the proprietary memory curator as agent-bound.
- Classify the interviewer as a portable capability with optimized host
  variants only because its trigger and outcome contracts materially differ.
- Classify the ADR workflow as one portable skill with capability-detected host
  adapters because its target contract is stable.
- Record the evidence dimensions used and do not split from cosmetic metadata,
  folder symmetry, or execution-host preference alone.
