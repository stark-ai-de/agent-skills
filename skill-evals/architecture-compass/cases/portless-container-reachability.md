# Container Listener and Host Publication Boundaries

## Should Trigger

Yes.

## Prompt

Portless runs on the developer host. The HTTP backend runs in a Docker bridge container and normally listens on the container interface. Apply the local-preview guide without making the application reachable from the LAN. Decide how the assigned port, container listener and host publication fit together.

## Deterministic Assertions

- contains: AC-ADR-066
- contains: namespace
- contains: loopback
- contains: published

## Expected Behavior

Identify the proxy and backend network namespace before choosing listener addresses. A backend in the same host namespace uses loopback. A bridge-container backend must listen on a container interface reachable through the published mapping; binding only its internal loopback breaks host-proxy access. Restrict publication to host loopback, register the reachable published port and verify the mapping to the internal listener, including the assigned PORT contract and port-conflict failure. Do not confuse an internal 0.0.0.0 listener with permission for all-interface host publication. Qualify the actual Docker mode and IPv4/IPv6 path; keep remote or otherwise unqualified routing pending instead of enabling LAN/public exposure. Retain and test the documented direct fallback.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
