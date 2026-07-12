# Read-only Explicitly Declined Fallback

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to decide ownership of a proposed shared invoicing
package. Native Plan mode is active. A separate enforceable Read Only transition
is available but inactive, and I explicitly decline that transition for this
request; do not ask again. Keep the decision conversational under the behavioral
no-write gate, do not inspect repository state, and do not implement anything.

## Deterministic Assertions

- contains: Planning capability: Active
- contains: Read-only enforcement: explicitly declined
- contains: Architecture decision status: pending
- contains: Execution status: not requested
- contains: behavioral no-write
- contains: shared invoicing package

## Expected Behavior

- Activate and classify shared-package ownership as an unresolved durable
  decision.
- Record `Planning capability: Active` separately from
  `Read-only enforcement: explicitly declined - <user statement>`.
- Do not repeat the declined transition request or claim the Plan instruction is
  an enforced filesystem boundary.
- Preserve the behavioral no-write gate, use only the supplied facts, ask the
  material ownership questions conversationally, and perform no repository,
  index, artifact, or external-state writes.
- Return pending/not-requested statuses because no implementation was requested.
