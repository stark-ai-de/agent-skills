# High Availability Deployment View

## Prompt

```text
Use $drawio-diagrams to turn the supplied fictional infrastructure manifest fixture into an editable deployment diagram for the on-call team. Show observed replicas, ingress, zone-spread intent, persistent storage, and backups. Clearly mark the exact availability-zone count and active failover design as unknown unless the evidence establishes them.
```

## Should Trigger

Yes

## Fixtures

- skill-evals/drawio-diagrams/fixtures/deployment-ha-manifests.yaml

## Expected Behavior

- Choose a deployment view rather than a source-code or business-process inventory.
- Model the four declared replicas, ingress, persistence, backup relationships, and the declared topology-spread intent.
- Distinguish manifest facts from requested/inferred topology, and surface the exact zone count and active failover path as evidence gaps.
- Distinguish active runtime paths from standby, recovery, and structural relationships.
- Keep ordinary routes and package details out of the on-call overview.

## Deterministic Assertions

- regex: deployment view|deployment diagram
- regex: topologySpreadConstraints|zone[- ]spread(?: constraint| intent)?
- regex: unknown|unconfirmed|not established|evidence gap
- regex: (?:four|4) (?:declared )?replicas
- contains: backup
