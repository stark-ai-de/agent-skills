# Declined Optional Tooling Fallback

## Prompt

```text
Use $drawio-diagrams to make `orders.drawio` and export a PNG. The preflight says Python is missing and no verified native draw.io CLI or browser is available. I decline installing packages, configuring MCP, or creating a persistent cache; finish the safe part locally.
```

## Should Trigger

Yes

## Expected Behavior

- Record the declined or unavailable capabilities and stop the optional setup branch.
- Author only the editable `.drawio` source through direct XML if that is still in scope.
- Do not invoke a missing Python/Node helper, install software, write MCP configuration, create a cache, or open a hosted preview.
- Report PNG export and browser rasterization as skipped or pending, with exact reasons and no fabricated success.
- Keep the capability receipt concise and free of temporary, private, or machine-specific paths.

## Deterministic Assertions

- regex: declined|not approved|unavailable
- contains: direct XML
- regex: skipped|pending|not produced
- regex: Python|python3
- regex: Node|node
- regex: MCP|persistent cache
- not_contains: install completed
- not_contains: export completed
