# WSL Windows CLI Raw Export Fallback

## Prompt

```text
Use $drawio-diagrams to export `service-map.drawio` from WSL2. The only available Desktop binary is the Windows `drawio.exe` under /mnt/c; there is no Linux-native draw.io package. Give me the safe export commands and do not claim that the transactional renderer ran.
```

## Should Trigger

Yes

## Expected Behavior

- Identify the Windows executable as usable only through a raw/manual export path from WSL, not through Linux descriptor-anchored staging.
- Run or recommend strict preflight and source validation before replacing maintained artifacts.
- Use explicit output paths that the Windows process can consume, then independently validate fresh PNG/SVG results.
- State that transactional guarantees are unavailable and that no artifact is claimed without format checks.
- Do not install a Linux package or alter MCP configuration without approval.

## Deterministic Assertions

- contains: /mnt/c
- regex: raw|manual export
- contains: transactional
- regex: unavailable|not (?:performed|available)
- contains: preflight-drawio-xml.mjs
- contains: validate_drawio.py
- contains: .windows-bridge
