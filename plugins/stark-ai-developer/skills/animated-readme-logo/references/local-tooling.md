# Local Tooling and Browser Fallbacks

Use this reference when a requested raster export, inspection, or visual preview lacks a working command.

## Keep capabilities separate

- SVG rasterizer: prefer `rsvg-convert` from librsvg for deterministic SVG-to-PNG frames.
- Animation encoder and probe: prefer headless FFmpeg with `ffmpeg` and `ffprobe` for GIF, APNG, and animated WebP.
- Structural inspection: use the bundled strict SVG validator and animated-image inspector; do not replace them with exporter self-reporting.
- Reusable GIF path: use the bundled `export-readme-logo-animation.mjs` after reviewing and checking the repository-owned recipe; the script performs no installation and preserves existing outputs on failure.
- Browser preview: use a configured Chrome or Chromium executable. It is not an exporter or inspector.

Do not report the whole pipeline unavailable because only a screenshot browser is missing.

## Missing-tool approval checkpoint

When a requested output needs a missing command:

1. Identify the exact missing command, requested output, active package manager, and whether the repository has a declarative source of truth.
2. Select the smallest package set. Prefer librsvg plus headless FFmpeg. Use ImageMagick or Inkscape only when a source requires a feature the smaller set lacks.
3. Present the package names, source, exact install command, persistence scope, expected download or disk impact when discoverable, and post-install verification commands.
4. Ask for explicit approval of that exact installation. Keep provider approval separate.
5. Stop before installation with `Animation delivery: blocked` and a clearly labeled local-tool approval pending.
6. After approval, install only the displayed set. Verify executable versions and the requested encoder, muxer, and filter support before exporting.
7. If the user declines, forbids installation, or the install path is unavailable, use `Animation delivery: incomplete`, retain verified intermediates, and create no placeholder.

Never turn an approval for one package manager, version, or package set into a broader update or installation.

## Platform selection

- Nix or NixOS: prefer `librsvg` and `ffmpeg-headless`. Add them to the repository's declarative package source when requested. If activating a dirty configuration would apply unrelated changes, propose a pinned temporary shell or profile install separately; do not switch the whole system implicitly.
- Debian or Ubuntu: discover the active release packages before proposing them; common names are `librsvg2-bin` and `ffmpeg`.
- Homebrew: common formulae are `librsvg` and `ffmpeg`.

Package names and versions are live facts. Inspect the active package manager instead of treating these examples as guarantees.

## Browser-preview fallback ladder

1. Inspect the current browser tool's help and environment for an explicit executable path or managed browser directory.
2. Retry with an existing compatible Chrome or Chromium executable. Do not require Chrome for Testing when a managed browser works.
3. If `agent-browser` already exists, inspect its version and help. When supported, load `agent-browser skills get core`, then launch with the existing executable path and capture the preview.
4. If the CLI is missing or too old, present an approval checkpoint for an exact `agent-browser` install or upgrade. Reuse an existing browser after installation.
5. Only when no compatible local browser exists, offer an approval-gated browser download such as `agent-browser install` or the platform's managed Chromium package.
6. If every approved route fails, report the local screenshot limitation and retain the manual committed-GitHub preview requirement.

Browser installation, browser launch, and provider generation are three different side-effect classes. Never infer approval across them.
