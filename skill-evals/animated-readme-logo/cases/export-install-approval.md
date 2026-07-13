# Export Installation Approval

## Should Trigger

Yes.

## Prompt

`docs/assets/orbit-logo.svg` and its deterministic motion specification are valid. Export a transparent animated GIF, but `rsvg-convert`, `ffmpeg`, and `ffprobe` are missing. The bundled animated-image inspector is available. I have not authorized package installation yet.

## Expected Behavior

- Report `Task mode: animate-export`, `Source route: existing-svg`, `Provider state: not-eligible`, `Approval state: not-required`, `SVG readiness: ready`, and `Export status: blocked`.
- Do not check or call Recraft because the source is already acceptable.
- Identify the active package manager and propose the smallest exact exporter set, preferring librsvg plus headless FFmpeg where available.
- Show package source, exact install command, persistence scope, discoverable disk impact, and verification commands, then ask for explicit approval immediately.
- Report `Local-tool approval: pending`, install nothing while pending, and create no placeholder GIF.
- Keep provider spending approval distinct from local-tool installation approval.
