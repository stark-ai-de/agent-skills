# Independent Container Alias Lifecycle

## Should Trigger

Yes.

## Prompt

An independently managed Docker bridge container is already running with a host-loopback published HTTP port. Register its Portless alias and later remove only the route while another project remains active. Another static alias might already use the requested name.

## Deterministic Assertions

- contains: AC-ADR-066
- contains: alias
- contains: ownership
- contains: loopback

## Expected Behavior

Verify container readiness, checkout/service identity and the published-to-internal listener mapping. Keep publication on host loopback and retain independent lifecycle ownership. Use the complete disambiguated alias name and discovered URL. Explain that v0.15.8 can overwrite static aliases without --force. Inspect the exact mapping and ownership before mutation, serialize through the route owner, and stop on conflicts or concurrent ownership uncertainty. Recheck ownership and remove only the matching alias. Preserve the container/backend, other routes and proxy; no global clean/prune or foreign process termination. Separate a Node alias fixture from actual Docker evidence.

## Evidence Stage

source/static: this is an evaluation contract, not an observed agent turn or
target runtime qualification. Keyword checks complement semantic review.
