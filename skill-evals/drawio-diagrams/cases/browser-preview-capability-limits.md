# Browser Preview And Fixed-Theme Capability Limits

## Prompt

```text
Use $drawio-diagrams to deliver an editable source with a browser-openable preview and a fixed light/dark comparison PNG. The browser may be present, missing, or unable to report a Chromium-family version; the local draw.io CLI may produce adaptive SVG only. Explain each capability result and do not claim unavailable previews.
```

## Should Trigger

Yes

## Expected Behavior

- Build and validate the editable `.drawio` source before browser delivery.
- Distinguish browser present, browser missing, and browser indeterminate/version-failed states without treating any as success.
- Use the browser URL path only for local user-opened delivery; detect an oversized URL and fall back to the `.drawio` file without hosted upload.
- Treat fixed-theme PNGs as a separate, approval-gated SVG-rasterization path requiring a pinned absolute Chromium-family executable.
- Keep adaptive SVG distinct from fixed light/dark SVG and report skipped rasterization honestly.

## Deterministic Assertions

- regex: present|missing|indeterminate|version
- contains: open-drawio-url.mjs
- regex: too long|oversized|URL.{0,}limit|fallback
- contains: rasterize-themed-svg.mjs
- regex: fixed (?:light|dark)|adaptive SVG
- regex: not (?:produced|generated)|pending|unavailable
- regex: fallback-browser-preview|fixed-theme-browser|non-canonical
- not_contains: hosted upload completed
