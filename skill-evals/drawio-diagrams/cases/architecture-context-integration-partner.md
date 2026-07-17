# Architecture Context For An Integration Partner

## Prompt

```text
Use $drawio-diagrams to create an editable diagrams.net overview for a new integration partner. Show how merchants and buyers interact with our invoicing platform, identity provider, payment processor, and email service. The repository also contains workers, queues, tables, build scripts, and deployment manifests.
```

## Should Trigger

Yes

## Expected Behavior

- Select a system-context view for the integration-partner audience.
- Show people, the invoicing-platform boundary, external systems, and directional interactions.
- Exclude internal runtime, source-package, and deployment inventory that does not answer the context question.
- Report the intentionally omitted implementation detail so reviewers know the scope is deliberate.

## Deterministic Assertions

- regex: context view|system context
- contains: system boundary
- regex: omitted|excluded
