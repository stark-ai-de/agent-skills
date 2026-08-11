# Linux-Native CLI Selection

## Prompt

```text
Use $drawio-diagrams to export the supplied editable architecture source to a PNG and SVG in WSL2. A Linux-native draw.io executable is available, but a Windows shell wrapper and a direct drawio.exe candidate are also visible. Select the safe local exporter and report the capability checks.
```

## Should Trigger

Yes

## Expected Behavior

- Detect the host as Linux/WSL and distinguish a Linux-native executable from a shell wrapper or Windows `.exe` candidate.
- Probe the selected native binary with `--version` before export and run a small PNG/SVG format smoke check.
- Keep the editable `.drawio` source canonical; run strict XML preflight and validation before export.
- Report successful PNG and SVG artifacts only after each file exists and passes format validation.
- Do not pass Linux `/proc/self/fd` staging paths to a Windows executable.

## Deterministic Assertions

- regex: Linux(?:-native| native)|WSL
- contains: --version
- regex: PNG.*SVG|SVG.*PNG
- contains: preflight-drawio-xml.mjs
- contains: validate_drawio.py
- regex: native._(?:selected|preferred)|Windows._(?:fallback|rejected|unsupported)
- contains: canonical
