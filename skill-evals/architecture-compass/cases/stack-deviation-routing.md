# Stack Deviation Routing

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to add retry handling to the existing customer lookup.
One engineer suggested adding Axios, but the accepted stack rule requires the
repository's `lib/http-client.ts` fetch wrapper, and that wrapper already supports
the required timeout, backoff, and typed error behavior. Confirm the deviation
result and implement the narrow call-site change if the existing stack is
sufficient. The later execution turn should validate with
`pnpm test --filter customer-lookup`. The host is already write-capable, so no
permission transition is required before that later execution.

## Deterministic Assertions

- contains: Selected workflow: refactor
- contains: Planning capability: Not applicable
- contains: Read-only enforcement: not applicable
- contains: Architecture decision status: not required
- contains: Execution status: ready for direct execution
- contains: existing stack is sufficient
- contains: lib/http-client.ts
- contains: pnpm test --filter customer-lookup

## Expected Behavior

- Activate because the request explicitly raises a possible stack deviation.
- Expose the five workflows and select direct `refactor` because accepted rules
  already resolve the durable choice and the requested change is bounded.
- Use the supplied accepted-stack and wrapper evidence without claiming a new
  file inspection in this text-only case.
- Conclude that the existing stack is sufficient and reject an unnecessary new
  dependency without creating a new ADR.
- Classify the change as ready for direct execution with
  `Architecture decision status: not required`; do not require Plan mode merely
  because a deviation was considered.
- Recognize that write capability is already active before using the ready
  execution status.
- Because this text-only eval has no executable fixture or file tools, do not
  claim an edit or validation ran. Return the required ready-for-direct-execution
  status with a narrow implementation outline and the focused
  `pnpm test --filter customer-lookup` validation the later execution turn
  should run.
- If evidence instead showed a real durable deviation, stop before edits, route
  it through the decision phase, and require the repository's ADR process.
