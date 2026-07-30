# Browser Preview Fallback

## Should Trigger

Yes.

## Prompt

Review the README delivery for an existing validated SVG, inspected animated GIF, and static PNG fallback. Playwright fails because its expected Chrome-for-Testing executable is absent, but a managed Chromium executable path and an installed `agent-browser` CLI may be available. Capture a local visual preview without changing the logo.

## Expected Behavior

- Report `Workflow: audit`, `Source route: existing-svg`, `Selection`, `Write scope and protected originals`, `Provider state: not-eligible`, `Approval state: not-required`, `Motion readiness: ready`, and `Animation delivery: completed`.
- Do not check or call Recraft and do not rerun raster export merely because browser preview failed.
- Inspect the current browser tool and environment, retry with the managed Chrome or Chromium executable, then use an existing `agent-browser` when available.
- Inspect `agent-browser` help and run `agent-browser skills get core` when the installed version supports it before driving the browser.
- Ask for separate explicit approval before installing or upgrading a browser CLI or downloading a browser; do not assume Chrome for Testing is mandatory.
- Keep the manual committed-GitHub preview requirement even after a successful local screenshot.
