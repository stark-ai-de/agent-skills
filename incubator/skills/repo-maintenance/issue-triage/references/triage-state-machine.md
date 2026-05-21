# Triage State Machine

## States

- `needs-reporter`: reporter must provide reproduction, logs, environment, or expected behavior.
- `needs-maintainer`: product, security, priority, or scope decision is required.
- `ready-for-agent`: scope, acceptance criteria, and validation command are clear.
- `ready-for-human`: work needs credentials, judgment, design authority, or external access.
- `blocked`: external dependency or prior decision blocks progress.
- `duplicate`: another issue owns the work.
- `wontfix`: maintainer has decided not to pursue the request.

## Transitions

Move to `ready-for-agent` only when the issue includes expected outcome, relevant files or feature area, constraints, and validation path.
