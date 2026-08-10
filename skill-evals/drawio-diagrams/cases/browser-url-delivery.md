# Browser URL Delivery

## Prompt

```text
Give me a browser-openable diagrams.net URL for a small editable flowchart when the local app is not installed.
```

## Should Trigger

Yes

## Expected Behavior

- Use the browser URL path only for user-opened local delivery.
- Avoid hosted previews or third-party uploads.
- Keep the source as editable draw.io XML.
- Explain any size or browser limitations honestly.

## Deterministic Assertions

- contains: open-drawio-url.mjs
- contains: editable
- contains: browser
- regex: capability|present|missing|indeterminate
- regex: URL.{0,}(?:limit|length)|oversized|too long|fallback
- not_contains: hosted upload completed
