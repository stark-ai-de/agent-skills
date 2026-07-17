# Dynamic Payment Failure View

## Prompt

```text
Create an editable diagrams.net diagram showing how one checkout attempt travels from a shopper through the web app, API, payment provider, queue, order store, and callback. The declined-payment path matters to reviewers.
```

## Should Trigger

Yes

## Expected Behavior

- Choose one named dynamic scenario with an explicit order instead of a steady-state component inventory.
- Label the important calls, events, payloads, protocols, and trust-boundary crossings.
- Include the central declined-payment alternate path without adding unrelated failure catalogs.
- Make both success and decline direction understandable in a static export.

## Deterministic Assertions

- regex: dynamic|ordered scenario|sequence
- contains: declined
- regex: protocol|payload
- contains: trust boundary
