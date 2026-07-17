# Editable Mind Map

## Prompt

```text
Use $drawio-diagrams to create `release-readiness-mindmap.drawio`. The center is Release Readiness; its first-level branches are Product, Engineering, Security, Operations, and Communications. Give each branch two labelled child topics and keep the result editable and readable.
```

## Should Trigger

Yes

## Expected Behavior

- Activate for the explicitly editable diagrams.net mind map.
- Use a balanced radial or tree layout with distinct first-level branches and ten readable child topics.
- Keep connectors subordinate to the topic hierarchy and avoid crossing labels.
- Validate the editable `.drawio` source and report the selected layout path.

## Deterministic Assertions

- contains: release-readiness-mindmap.drawio
- contains: Release Readiness
- regex: radial|tree|mind map|mindmap
- contains: validate_drawio.py
