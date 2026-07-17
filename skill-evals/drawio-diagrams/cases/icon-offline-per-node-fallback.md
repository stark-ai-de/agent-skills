# Offline Per-Node Icon Fallback

## Prompt

```text
Use $drawio-diagrams to update the supplied architecture fixture with OpenAI, Slack, and a custom queue while working offline. It already contains an accepted embedded PostgreSQL mark.
```

## Should Trigger

Yes

## Fixtures

- skill-evals/drawio-diagrams/fixtures/offline-icon-before.drawio

## Expected Behavior

- Reuse the accepted embedded PostgreSQL asset.
- Resolve no network assets and create no package install, bulk download, or persistent cache.
- Substitute labelled semantic icons only for unresolved nodes rather than dropping every icon.
- Keep one coherent visual family and disclose each substitution concisely.

## Deterministic Assertions

- contains: offline
- regex: reuse|embedded PostgreSQL
- regex: semantic icon|fallback
- contains: substitution
