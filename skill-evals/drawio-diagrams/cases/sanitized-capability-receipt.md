# Sanitized Capability Receipt

## Prompt

```text
Use $drawio-diagrams to preflight the local diagram toolchain and report the result for a review record. The receipt must be deterministic and useful, but must not expose temporary directories, private repository paths, usernames, or raw command-line arguments.
```

## Should Trigger

Yes

## Expected Behavior

- Return a concise receipt with stable capability names, status (`available`, `missing`, `rejected`, or `indeterminate`), and the selected safe fallback.
- Redact or omit temporary paths, home-directory paths, usernames, `/mnt/c` user paths, and full command lines from the receipt.
- Do not create files, install tools, open a browser, run a hosted transfer, or perform a render merely to produce the review receipt.
- Keep the result reproducible across hosts by reporting capability class and reason rather than volatile versions or paths.

## Deterministic Assertions

- regex: receipt|capabilit(?:y|ies)
- regex: available|missing|rejected|indeterminate
- regex: sanitized|redact|omit
- not_contains: /tmp
- not_contains: /home/
- not_contains: /mnt/c/Users/
- not_contains: --user-data-dir
- not_contains: private path
