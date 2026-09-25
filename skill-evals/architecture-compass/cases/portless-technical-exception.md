# Runtime and Trust Qualification

## Should Trigger

Yes.

## Prompt

Plan Portless adoption for Bun-first scripts in NixOS/WSL. Upstream lists Node requirements, the browser uses a different trust store, and one app ignores the injected PORT. The user has not authorized host certificate or hosts-file changes.

## Deterministic Assertions

- contains: AC-ADR-065
- contains: AC-ADR-058
- contains: evidence
- contains: revisit
- contains: trust

## Expected Behavior

Keep AC-ADR-058: neither Bun compatibility nor its rejection follows from a Node engine declaration alone. Qualify the actual command and port listener. Separate host trust/bootstrap from repository integration and respect its authority. Mark unresolved HTTPS/port prerequisites pending; use an owned, scoped temporary fallback with evidence and revisit trigger. Generic Linux support is not NixOS trust proof. Do not claim completed adoption or mutate host trust from this planning request.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
