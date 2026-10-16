# Cross-Service Host and WebSocket Forwarding

## Should Trigger

Yes.

## Prompt

A frontend forwards /api to a second Portless service and receives 508 Loop Detected. Both services belong to this checkout. Correct the forwarding configuration and define a two-service test without guessed URLs or weakened TLS.

## Deterministic Assertions

- contains: AC-ADR-066
- contains: changeOrigin: true
- contains: ws: true
- contains: 508

## Expected Behavior

Discover the complete API URL through the same CLI/state environment; account for already-disambiguated names without a duplicate worktree prefix. Confirm route and API identity because get alone does not check registration. Rewrite Host with changeOrigin: true, enable required WebSocket forwarding with ws: true and preserve the original hop header. A negative control without rewriting must produce 508; the corrected path returns the API identity and a WebSocket message. Provide Node CA trust at process startup. Never disable certificate verification or downgrade HTTPS as the routing fix. A Node fixture is not Vite/HMR or browser qualification.

## Evidence Stage

source/static: this is an evaluation contract, not an observed agent turn or
target runtime qualification. Keyword checks complement semantic review.
