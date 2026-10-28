# MCP review information imported from the ZIP

The canonical listing source `stark-ai-developer.json` owns `mcpSubmission`.
For the Tools remote profile, the OpenAI generator copies it into
`.codex-plugin/plugin.json` under `extensions.com.openai`. Skills-only packages
omit these fields. Canonical skill-local `agents/openai.yaml` files are unchanged.

The package supplies exactly five positive and three negative review cases,
no-commerce information, release notes and German listing text.
Country targeting is omitted to preserve the portal’s existing targeting; verify it manually before submission.
English remains the base listing language; localization does not translate the
skill files or add language guarantees to the runtime.

The eight cases use synthetic supplied metadata. They cover minimal and optional
skill fields, portable and OpenAI manifests, correcting a mismatch, malformed
input, missing fields and unsupported file/URL/shell actions. Passing direct MCP
tests does not establish model refusal or native client installation behavior.
Run the cases in the target client before submission.

The review metadata points to the Remotion edition:
https://stark-ai-developer-review.vercel.app/walkthrough-remotion.mp4.
The Remotion player is at
https://stark-ai-developer-review.vercel.app/remotion.html.
The original live recording, English captions and transcript remain available at
https://stark-ai-developer-review.vercel.app/.

The original 2 minute 20 second walkthrough records a standalone review client making
actual production MCP requests: initialization, discovery and all eight scenarios
(13 tool calls). It uses synthetic data and displays the actual responses. It is
not a ChatGPT conversation or OpenAI portal recording, and does not establish
native installation or model refusal. The negative action case demonstrates
MCP argument rejection. Public playback, HTTP range requests and file digest
were verified. The 1 minute 48 second Remotion edition visualizes those same recorded requests
and responses with an intro, chapter navigation and result summary. It is an
evidence replay, not a new live session or a ChatGPT/portal recording.
The Vercel project `stark-ai-developer-review` hosts only static
review assets; production is public and previews remain protected. The MCP
project and endpoint are unchanged.

Do not package reviewer credentials or private instructions; enter them in the
secure portal if ever required. This metadata MCP uses No auth and needs no
reviewer account.

## Current review handoff

On 17 October 2026 (Europe/Berlin), the maintainer reported that the new plugin
was uploaded and is in review. This is a maintainer-reported portal observation,
not an independently verified approval or publication. The existing-identity
update attempt did not work; the active route is B (`new-remote`). Keep this
submission active and address any review feedback on this route.

The real domain-verification challenge was deployed as production Vercel
configuration and verified as public exact bytes at
`https://skills-mcp.stark-ai.de/.well-known/openai-apps-challenge`. The token is
not tracked. To rotate it, use `vercel env update OPENAI_APPS_CHALLENGE production`
in the locally linked MCP worktree, then redeploy with
`--local-config packages/skill-metadata-mcp/vercel.json`. A first-time setup uses
`vercel env add` instead. The value must be available at build time because the
challenge is a static file in Vercel public output.

[Walkthrough sources and exact public assets](review-video/README.md) preserve
the video work, authoring lockfile, synthetic responses and static hosting
payload. They contain no private portal state.

For a future authorized package update, generate a separate upload candidate with the repository package command and
`--profile new-remote --output dist/openai/candidates/review-prefill/openai.zip`.
Validate it with the same profile. Re-upload the ZIP in the new plugin draft;
review cases imported from the package become read-only in the portal. Omitted
scalar fields preserve previously saved values, so omitting a scalar declaration preserves an existing portal value.

The published v0.29.0 assets remain immutable. A local candidate with additional
review metadata is not that releaseasset and needs its own digest and source
state record. Do not replace published assets or treat an in-review draft as approved or published.

Source checked 2026-10-16:
[OpenAI submission metadata reference](https://developers.openai.com/plugins/deploy/submission).

The walkthrough is historical first-submission evidence and shows version 1.0.0. Verify that it remains representative before using it for a later submission.
