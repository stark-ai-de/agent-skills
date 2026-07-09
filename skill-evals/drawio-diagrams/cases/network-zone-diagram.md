# Network Zone Diagram

## Prompt

```text
Use $drawio-diagrams to create an editable network diagram with Internet, DMZ, private subnet, firewall, load balancer, app servers, and database.
```

## Should Trigger

Yes

## Expected Behavior

- Use zones or containers for network boundaries.
- Keep connector direction and labels readable.
- Route cross-zone links cleanly.
- Validate geometry and report any routing warnings.

## Deterministic Assertions

- contains: zone
- contains: firewall
- contains: validate-drawio-diagram-rules.mjs
