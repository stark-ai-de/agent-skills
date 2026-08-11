# Toolset Preflight And Install Approval

## Prompt

```text
Use $drawio-diagrams to create an editable architecture diagram and export PNG/SVG. Before authoring, check whether Python, Node, and a usable draw.io CLI are available. If an export dependency is missing, propose the exact install or setup action for approval instead of installing it.
```

## Should Trigger

Yes

## Expected Behavior

- Perform an upfront, read-only capability preflight for Python, Node, draw.io, and any browser required for fixed-theme rasterization.
- Separate the safe direct-XML path from optional installs, MCP configuration, hosted previews, browser rasterization, and file-writing fallback helpers; the named PNG/SVG request authorizes native writes only.
- Ask one batched approval question that names the proposed install/setup action and its effect; do not install during preflight.
- Continue with direct XML and validation when export tooling is absent, while clearly marking PNG/SVG as pending.
- Keep the source editable and report a sanitized capability receipt rather than raw host paths.

## Deterministic Assertions

- regex: preflight|capabilit(?:y|ies) check
- regex: Python|python3
- regex: Node|node
- contains: draw.io
- regex: install|setup
- contains: approval
- regex: pending|unavailable|fallback
- regex: sanitized|receipt
