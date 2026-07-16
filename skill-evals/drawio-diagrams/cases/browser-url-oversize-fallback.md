# Oversized Browser URL Fallback

## Prompt

```text
Use $drawio-diagrams to create an editable browser-openable diagrams.net architecture map with Gateway plus Workers 01 through 80, each connected to Gateway and labelled with its number. Save the source as `gateway-workers.drawio`. The encoded URL is 6,400 characters, but this environment's reliable URL limit is 2,000 characters; use the documented fallback instead of opening it.
```

## Should Trigger

Yes

## Expected Behavior

- Build and validate the editable diagram before attempting browser-fragment delivery.
- Measure or detect an oversized URL rather than claiming it will open reliably.
- If the URL is too long, deliver the `.drawio` file instead and do not upload it to a hosted preview.
- Report the fallback and retain all 80 distinct worker labels.

## Deterministic Assertions

- contains: open-drawio-url.mjs
- contains: gateway-workers.drawio
- regex: too long|oversized|length|size limit
- regex: fallback|deliver the .drawio|local file
