# First Installation and Per-Host CA Ownership

## Should Trigger

Yes.

## Prompt

Two developers share a Nix configuration repository. One machine already has a working Portless CA; the second machine is new and has neither that CA's private key nor provisioned trust. The second developer authorizes local host provisioning. Define first installation and later recovery without sharing private CA keys or changing the first developer's setup.

## Deterministic Assertions

- contains: AC-ADR-066
- contains: bootstrap
- contains: fingerprint
- contains: pending

## Expected Behavior

Choose an explicit host/user owner, state directory and host-specific public CA input. The new host uses a separately invoked, authorized and version-qualified bootstrap to create its own CA/key pair in protected state; do not copy the first developer's private CA key or silently initialize from the repository start command. Declare the new public CA/fingerprint, establish only the required client trust and verify the key pair, permissions, validity and trust chain before the first proxy start. Start the owned proxy for real HTTPS client verification, then mark provisioning complete and enable normal managed startup only after success. A Windows client of the same WSL proxy may trust that proxy's verified public CA without receiving its private key. For an already provisioned host, a missing/mismatched CA fails closed for restoration or explicit rotation. Missing authority or unverified trust remains pending; no TLS bypass or automatic regeneration substitutes for recovery.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
