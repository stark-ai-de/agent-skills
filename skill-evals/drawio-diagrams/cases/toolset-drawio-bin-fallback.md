# DRAWIO_BIN Candidate Fallback

## Prompt

```text
Use $drawio-diagrams to export this editable source. DRAWIO_BIN points first to a stale path, then to a non-executable file, and finally to a Windows /mnt/c drawio.exe candidate; a working Linux-native drawio command is on PATH. Continue safely without installing anything.
```

## Should Trigger

Yes

## Expected Behavior

- Treat a missing, stale, invalid, or non-executable `DRAWIO_BIN` value as unavailable and continue candidate discovery.
- Reject direct `/mnt/c/.../drawio.exe` and shell-wrapper Windows candidates for the descriptor-anchored Linux renderer.
- Select the verified Linux-native PATH candidate only after a successful version probe.
- If no native candidate remains, use the raw/manual export fallback and say that transactional rendering was not performed.
- Never claim an export from a path that did not create validated PNG/SVG artifacts.

## Deterministic Assertions

- contains: DRAWIO_BIN
- regex: stale|invalid|non-executable|unavailable
- contains: /mnt/c
- regex: Linux-native|native PATH|raw/manual export|fallback
- contains: --version
- regex: no (?:validated )?PNG|SVG|artifact
