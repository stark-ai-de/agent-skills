# OpenAI review walkthrough sources

This maintainer-only project preserves the publisher-owned walkthroughs used for
the first `stark-ai-developer-tools` MCP submission. It is outside the production
workspace and is not included in any plugin ZIP. Remotion is a local authoring
dependency, not a runtime dependency of the MCP.

## What is preserved

- `src/`: editable Remotion scenes, plus the exact synthetic request/response data.
- `recorded-mcp-responses.json`: all 15 original production responses, including
  initialization and discovery; 13 tool calls cover five positive and three
  negative scenarios. `recording-cases.json` contains the expected checks.
- `site/`: the exact published MP4s, players, English captions and transcript.
  This static payload can be redeployed without rerendering or recapturing.
- `assets.json`: video digests and the prepared upload-candidate identity. The
  maintainer reports review is in progress; the exact uploaded ZIP digest was
  not independently read from the private portal.
- An isolated package manifest and lockfile pin Remotion 4.0.535. The root
  dependency closure is unchanged. The official authoring skill is external:
  https://github.com/remotion-dev/skills.

The Remotion video replays the recorded data. It does not claim to be a fresh
live recording or an OpenAI/ChatGPT UI. Native installation and model refusal
remain separate observations. No portal IDs, credentials or verification tokens
are stored here. The recorded inputs intentionally include synthetic unsupported
file, URL and shell arguments to demonstrate tool-interface rejection.

## Edit or render

From the repository root, using the managed Linux Node/pnpm toolchain:

```bash
pnpm --dir docs/listing/openai/review-video install --frozen-lockfile
pnpm --dir docs/listing/openai/review-video run typecheck
pnpm --dir docs/listing/openai/review-video run dev
```

Export only when a new media version is actually needed:

```bash
pnpm --dir docs/listing/openai/review-video run render
```

This writes `dist/review-video/remotion-rebuilt.mp4`. On NixOS, pass
`--browser-executable` with the managed Chromium path if the downloaded browser
cannot load system libraries. Do not put machine-specific browser paths into
tracked configuration. The original export was 1920 x 1080, 30 fps, H.264,
CRF 20. Encoder and browser differences can change byte digests when rerendering;
use the preserved `site/` assets for exact redeployment.

## Re-capture actual production responses (optional)

```bash
pnpm --dir docs/listing/openai/review-video run record:client
```

Open http://127.0.0.1:8799 in a separate recording browser and choose Start live
walkthrough. This performs actual synthetic requests against the fixed public
MCP endpoint and writes ignored `recorded-mcp-responses-new.json`; it does not
replace the original fixture. It runs no arbitrary URLs or commands. Stop the
server when finished. New results must be reviewed before replacing the source
fixture or publishing a new video. Rendering the preserved recording needs no
network access to the production MCP.

## Redeploy the existing static assets

Check the selected Vercel account/team and link `site/` to the existing
`stark-ai-developer-review` project. Project linkage stays local and ignored.
Deployment is a separate authorized maintainer action:

```bash
vercel link --cwd docs/listing/openai/review-video/site --project stark-ai-developer-review --scope servrox-solutions
vercel deploy --prod --yes --scope servrox-solutions --cwd docs/listing/openai/review-video/site
```

Production must remain public; previews remain protected. Verify the MP4 bytes
against `assets.json`, anonymous HTTP 200 and range HTTP 206 after deployment.
The static site has no backend, dependencies or secret configuration. Deploying
it does not modify the `stark-ai-developer-mcp` project.

While the plugin is under review, preserve the submitted ZIP and hosted tool
contracts. Merging this PR is not OpenAI approval, publication or authorization
to replace a package under review. Do not overwrite the published v0.29.0 assets.
