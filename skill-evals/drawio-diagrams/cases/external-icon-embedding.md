# External Icon Embedding

## Prompt

```text
Use $drawio-diagrams to create an uncompressed, editable `langsmith-icon.drawio` with the exact LangSmith product logo and a readable label, then export `langsmith-icon.svg`. Selected read-only network retrieval is allowed, but do not install or bulk-download anything.
```

## Should Trigger

Yes

## Expected Behavior

- Activate because the user requested draw.io work.
- Resolve the selected LangSmith SVG from Lobe Icons when read-only network policy allows; do not present the lookup as legal approval.
- Ask only if the host requires network consent or the action would install, bulk-download, or create a persistent cache.
- Validate and embed the SVG as image data with `aspect=fixed`; neither maintained artifact may depend on an unpkg or other provider URL at runtime.
- In a text-only rollout, provide the exact bounded retrieval/embedding/validation workflow and state that artifacts were not produced; never invent a resolved version or successful render.
- In an artifact-capable run, create both named artifacts when the selected logo and renderer are available and record the Lobe Icons provider, resolved package version, slug/variant, and retrieval-only source URL.
- Include the single rights-responsibility notice without a per-icon legal report. Treat inability to resolve or render the exact logo as an eval failure rather than silently substituting a semantic icon.

## Deterministic Assertions

- contains: langsmith-icon.drawio
- contains: langsmith-icon.svg
- contains: @lobehub/icons-static-svg
- contains: aspect=fixed
- contains: validate_drawio.py
- contains: Rights notice
- regex: not produced|not created|artifact-capable|would create
