# Audit and PR Review Routing

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to audit this checkout against accepted ADRs and then
review the current branch diff for package-ownership and server-only boundary
drift. A native host review surface is available. Return findings only; do not
plan or implement remediation. Read-only enforcement is active for the audit
independently of Plan mode, and the native review surface establishes the diff
review's no-write boundary. The supplied evidence says accepted ADR-0002 keeps
the orders contract in `packages/orders/src/contract.ts`, but the branch moves
it to `apps/web/lib/orders-contract.ts`. Accepted ADR-0005 requires a
`server-only` sentinel in hand-written files under `lib/server-only/`, but the
diff adds `apps/web/lib/server-only/order-client.ts` without that sentinel.

## Deterministic Assertions

- contains: Planning capability: Not applicable
- contains: Read-only enforcement: enforced
- contains: Architecture decision status: not required
- contains: Execution status: not requested
- contains: read-only audit
- contains: host review surface
- contains: package ownership
- contains: server-only
- contains: apps/web/lib/orders-contract.ts
- contains: apps/web/lib/server-only/order-client.ts

## Expected Behavior

- Activate for both architecture audit and PR, branch, or diff review work.
- Run the audit read-only without requiring Plan mode solely because the subject
  is architectural.
- Prefer the available host review surface for the diff and return prioritized,
  evidence-backed findings from the supplied facts with the named paths and
  governing ADRs. Do not claim additional repository inspection occurred.
- Record the audit enforcement and review-surface boundary without requesting
  Plan mode.
- Return `Architecture decision status: not required` and
  `Execution status: not requested` because remediation was not requested.
- Perform no edits, patches, staging, external writes, or implementation
  continuation.
- If a finding later requires a disputed durable decision, treat its remediation
  as a separate request and classify that decision independently.
