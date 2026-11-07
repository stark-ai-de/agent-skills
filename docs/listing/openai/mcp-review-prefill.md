# MCP review information imported from the ZIP

The canonical listing source `stark-ai-developer.json` owns `mcpSubmission`.
For the Tools remote profile, the OpenAI generator copies it into
`.codex-plugin/plugin.json` under `extensions.com.openai`. Skills-only packages
omit these fields. Canonical skill-local `agents/openai.yaml` files are unchanged.

The Tools package supplies exactly five positive and three negative review cases,
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

## Historical first-submission handoff

On 17 October 2026 (Europe/Berlin), the maintainer reported that the new plugin
was uploaded and is in review. This is a maintainer-reported portal observation,
not an independently verified approval or publication. The existing-identity
update attempt did not work; the active route at that time was B (`new-remote`).
This dated record does not establish current portal state. For current releases,
update the two existing identities using their matching tagged archives and
[generated handoffs](../../publishing.md#operator-follow-up). Address review
feedback on the affected listing without inferring a new identity or migration.

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

## Package-managed review information

The [official submission reference](https://developers.openai.com/plugins/deploy/submission#configure-onboarding-review-and-publication),
checked 2026-11-07, requires exactly five positive and three negative cases for
initial MCP review. Upload may accept partial lists; complete them before
submission. Skills-only plugins need no MCP review cases or demo recording.
Both profiles preserve their existing targeting by omitting
`publication.countries`; `[]` would remove country restrictions.

Review cases imported from the ZIP are read-only in the dashboard. Change the
canonical listing source, regenerate and validate a new candidate, then upload
it to the same listing. Omission or `test_cases: null` preserves saved cases;
`test_cases: {}` clears both lists. Omitting cases in a later upload does not
restore dashboard editing.

For scalar review fields and `publication.release_notes`, omission or `null`
preserves saved values and an empty string clears text. Explicit package values
are reapplied on submission; remove the declaration if an editable dashboard
value is intended to govern. Credentials and reviewer instructions stay in the
secure portal form; never add `test_credentials` or `reviewer_instructions` to
the ZIP. The current metadata service uses No auth and needs no reviewer account.

Candidate packages are distinct from released assets and need their own digest
and source-state record. Do not replace immutable published archives or treat
an in-review draft as approved or published. After approval, explicitly publish
the replacement while keeping the previous version available during review.
For later live tool changes, follow [continuous MCP review](../../publishing.md#mcp-updates-after-publication).

The walkthrough is historical first-submission evidence and shows version 1.0.0. Verify that it remains representative before using it for a later submission.
