# First publication notes: stark AI Developer

Observed 2026-08-19 after the first public OpenAI plugin listing. This file is
the repository source for those portal and product-surface observations. Phase 6
listing is complete.

Listing copy is [`stark-ai-developer.json`](stark-ai-developer.json). Recommended
values are
[`stark-ai-developer-values-review.md`](stark-ai-developer-values-review.md).
Regenerate
[`stark-ai-developer-release-evidence.json`](stark-ai-developer-release-evidence.json)
only from a clean tagged identity.

Do not add secrets, tokens, cookies, private reviewer messages, customer data,
or machine-specific paths here.

## Telegram Serverless update handoff

Prepared 2026-10-08 for plugin 1.8.0; no portal upload or publication observation. The canonical bundle adds Telegram Serverless 0.1.0, with CHAT/CODEX discovery enabled, a portable starter prompt, an original packaged icon and portal glyph `code`. Its [offline assessment](../../../skill-evals/telegram-serverless/runs/2026-10-08-offline-promotion.md) records the qualification limits.

For a later authorized release, use the exact post-release OpenAI archive and generated handoff issue, inspect every packaged skill interface, preserve the existing glyphs and add `code` for Telegram Serverless. Verify the new service disclosure and distinguish actual host invocation from local metadata checks. Record hosted discovery, account access and live Telegram evidence separately. The dated Jev and first-publication observations below remain historical.

## Jev update handoff

**Prepared 2026-09-23 for plugin 1.3.0; not a new portal publication observation.** The dated first-publication records below remain historical. The bundled plugin contains seven skills, including Jev Capability Advisor. Jev's optional advice and inspection scope was accepted for promotion on 2026-09-25; its [release handoff](../../skills/jev-capability-advisor/README.md#release-handoff) documents the release process.

The historical 1.3.0 handoff specified the following after GitHub publication
and post-release evidence. Current releases use the two-profile procedure below:

- Update the **existing** plugin using the release's exact direct `openai.zip`; do not create a second listing or upload the portable ZIP.
- Check all **seven** packaged skill interfaces against the generated **Release OpenAI Plugin** issue. Jev is **CODEX only**, with implicit invocation allowed and portal glyph **`chart`**. This metadata does not install a pre-prompt hook.
- Preserve the six existing glyphs recorded below; use `chart` for Jev. Verify its packaged icon and restore the portal glyph if the upload ignores it.
- Preserve Plugin Info logos and restore both [Composer icons](#composer-icon-handoff) if the package update resets them. Inspect light and dark modes.
- Complete the portal's scans/review and explicit publication, then verify directory propagation and a Codex install/update. Record that observation separately from local packaging and CI.

The [official submission guide](https://developers.openai.com/plugins/deploy/submission) is the live source for portal controls. Reviewed on 2026-09-23; no upload, approval or publication for this update has been performed by the release-preparation task.

## Observed listing

The public ChatGPT plugin page is:

https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e

The public listing slug parsed from that URL is
`plugins_6a85d98a7bc48191879aedd91610271e`. Authenticated Platform and
submission identifiers are private portal evidence and are intentionally not
recorded here.

That URL is stored as `plugin.urls.chatgptPlugin`. Catalog website, privacy,
terms, support, and security URLs stay on GitHub Pages. The OpenAI zip
`websiteURL` must keep the GitHub Pages plugin landing. Do not copy
`chatgptPlugin` into `.codex-plugin/plugin.json`.

ChatGPT and Codex share one Plugins Directory. Observed surfaces:

| Surface                                         | Observation                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| ChatGPT web plugin page                         | Live public card at the URL above                                |
| ChatGPT desktop/Windows, Chat or Codex selected | Same Plugins Directory as ChatGPT web                            |
| Codex CLI                                       | Marketplace `/plugins` flow; no separate public Codex website    |
| Codex IDE extension                             | Plugins not supported; do not claim a public plugin install path |

There is no documented separate Codex web directory URL. Do not invent one.

OpenAI does not publish a README embed, "Add to ChatGPT" button, or Plugins
Directory badge. The in-product OpenAI Verified mark is granted on the
directory card and must not be copied. The repository README uses a
ChatGPT-styled shield at `docs/assets/chatgpt-plugin-badge.svg` that links to
`plugin.urls.chatgptPlugin` and shows the current `plugin.version`. Do not add
a second Codex directory badge.

GitHub Pages plugin, privacy, terms, support, and security URLs returned HTTP
200 when checked during first publication. Publisher legal name remains
`servrox solutions UG`. Publisher legal seat remains Germany.

## Upload and package

For the dated first publication, the OpenAI-native archive came from
`dist/openai/`; this is historical evidence, not the current update procedure.
For each current update, wait for successful exact-tag Post-release Evidence.
Upload the exact direct `openai-skills-only.zip` asset to the existing
[stark-ai-developer listing](https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e)
and the exact direct `openai-tools.zip` asset to the existing
[stark-ai-developer-tools listing](https://chatgpt.com/plugins/plugin_asdk_app_6ad281cbc9a481919d8d5e123985ddc8).
Use the two generated profile-specific handoffs, preserve the remote MCP origin,
and track each portal scan, review and publication independently. Do not upload
the portable Agent Plugins archive or a GitHub source archive. See
`docs/publishing.md#operator-follow-up` for the current handoff.

Plugin version `1.0.0` is independent of the repository catalog version. The
first public source identity is Git tag `v0.19.1` (`35101f2` on `main`). There
is no GitHub release named `v1.0.0`. Use the OpenAI zip, not a GitHub source
archive, for portal upload.

Bundled `agents/openai.yaml` is copied unchanged into projections. Do not
adapter-overlay, rewrite, or generate that file.

The committed release-evidence record is the clean `v0.19.1` freeze:

- OpenAI zip SHA-256 `eeaa4252ec09541cce068c96ab0ae5f027d3884c27b6636b640814d7d49a3615`
- 2,077,638 bytes
- `sourceState`: clean

After that freeze, official square logos replaced the catalog PWA icon in
listing assets and a later working-tree package was built. That later zip is
not a freeze and must not reuse the freeze hash:

- OpenAI zip SHA-256 `43194491e1602538ac9c89c55d083f351636dbb19463e4fc63173984a41f2be7`
- 2,249,344 bytes
- dirty working tree; evidence JSON was not regenerated

The current `SOURCE_TREE_HASH_RECIPE` hashes `site/public/logo.png` and
`site/public/logo-dark.png`. The committed evidence recipe still cites
`site/public/icon-512.png` until a maintainer regenerates evidence from a
clean tagged identity. Do not treat the committed evidence file as current
proof of the logo swap or of the ChatGPT plugin URL.

## Portal observations

### Portal identifiers

Authenticated Apps Management URLs, organization identifiers, verified-person
records, and submission identifiers are private portal evidence. They are
intentionally omitted from this public repository. The public ChatGPT plugin
URL remains in the listing source; it is the only portal-facing link required
for public directory identity. Do not add authenticated portal URLs or account
identifiers to listing fields, README badges, `.codex-plugin/plugin.json`,
release evidence, or the public handoff issue.

### Country targeting

The first-publication portal did not expose a publisher country or region picker.
That dated observation does not describe every later portal build. The current
[submission field reference](https://developers.openai.com/plugins/deploy/submission#configure-onboarding-review-and-publication),
checked 2026-11-07, supports `extensions.com.openai.publication.countries`.
Omission preserves saved targeting; `[]` removes country restrictions. Both
release profiles omit this field to preserve their existing targeting. Verify
it in the portal before submission. Do not add the unrelated
`listing.availability` field or infer worldwide availability. Publisher legal
seat remains Germany.

### Skill metadata warnings

Upload produced six non-blocking `skill_metadata_ignored` warnings.
`SKILL.md` `metadata:` (`author`, `category`, `version`) is ignored for the
OpenAI plugin interface. The interface lives in `agents/openai.yaml`. Do not
strip `SKILL.md` metadata to silence the warning.

### Safety and security scan

Required metadata and skill scans must succeed before submission. The current
[submission guide](https://developers.openai.com/plugins/deploy/submission),
checked 2026-11-07, gives no fixed scan completion time. Scan completion,
human review, approval and publication are separate observations. Do not reuse
the historical two-hour scan estimate as a current deadline.

### Portal skill glyphs

Apps Management exposes a twelve-icon picker on the plugin draft. Glyph names
come from the control `aria-label` (`Use chat icon` → `chat`):

`default`, `bolt`, `chart`, `chat`, `code`, `cursor`, `heart`, `hierarchy`,
`pdf`, `pen`, `radar`, `search`

These names are portal-only. Pin the reviewed glyph for each skill as
`listing.skills[].portalGlyph` for `pnpm run verify:openai-directory`. Do not
write a named-palette key such as `icon: chat` into `agents/openai.yaml`.
OpenAI's skill metadata supports packaged `icon_small` and `icon_large` paths;
version 1.1.0 uses those fields for six original transparent PNGs. If the portal
ignores the package selection during update, restore the reviewed portal glyphs
below manually.

Keep one distinct glyph per skill:

| Skill                    | Glyph       | Why                                                  |
| ------------------------ | ----------- | ---------------------------------------------------- |
| `codex-spec-interviewer` | `chat`      | The workflow is an interview.                        |
| `architecture-compass`   | `hierarchy` | ADRs and system structure.                           |
| `codegraph-ast-grep`     | `search`    | Structural code search.                              |
| `drawio-diagrams`        | `pen`       | Create and edit diagrams.                            |
| `animated-readme-logo`   | `bolt`      | Generate, transform, or animate presentation assets. |
| `codex-memory-curator`   | `radar`     | Scan, audit, and curate memory.                      |

Leave `code`, `chart`, `pdf`, `cursor`, `heart`, and `default` unused. Do not
select `cursor`; that glyph is a browser window, not Cursor the product. The
only reviewed swap is `code` for `codegraph-ast-grep` if the search glyph is
too generic in the portal UI.

### Packaged skill icons and portal limits

Each bundled skill ships `assets/openai-icon.png` and references it unchanged
for `icon_small` and `icon_large`. The OpenAI plugin manifest has separate
listing and Composer images. Current packages include both theme variants;
verify the imported images and every packaged skill icon after upload.
Portal glyph observations above remain historical and do not guarantee that
package updates preserve dashboard selections.

### Composer icon handoff

The [official submission field reference](https://developers.openai.com/plugins/deploy/submission#listing-metadata),
checked 2026-11-07, documents `interface.logo`, `interface.logoDark`,
`interface.composerIcon` and `interface.composerIconDark` for Codex packages.
Dark variants are optional; brand colors do not select image files. The
canonical listing supplies these existing PNGs, copied without rewriting:

| Manifest field     | Repository source                                                         | Archive path                    |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------- |
| `logo`             | `site/public/logo.png`                                                    | `assets/logo.png`               |
| `logoDark`         | `site/public/logo-dark.png`                                               | `assets/logo-dark.png`          |
| `composerIcon`     | [chatgpt-composer-icon-light.png](assets/chatgpt-composer-icon-light.png) | `assets/composer-icon.png`      |
| `composerIconDark` | [chatgpt-composer-icon-dark.png](assets/chatgpt-composer-icon-dark.png)   | `assets/composer-icon-dark.png` |

After each verified ZIP upload:

1. Inspect both Plugin Info logos and both Composer previews against the table.
   The listing logos and Composer images have different purposes.
2. If an older verified release ZIP omits dark fields or the portal did not
   import an image, use the available image controls to restore the exact source
   PNGs above. Download original PNG bytes from the reviewed release revision;
   do not upload screenshots or GitHub file-view pages. If a field is package
   managed and read-only, correct the canonical source and submit a new package
   instead of relying on a dashboard override.
3. Verify all packaged skill icons, save any supported manual selections, and
   check light/dark rendering and directory identity after propagation.

The Composer PNGs are transparent 1024×1024 images with no added side padding.
Never unpack, modify or repack an already verified release ZIP. Published
archives remain immutable; portal observations are separate acceptance evidence.
SVG support alone does not establish theme switching through CSS.

## Brand assets

Official 2048×2048 PNGs from the stark-ai.de landing page were copied
byte-identical into `site/public/logo.png` (light) and
`site/public/logo-dark.png` (dark). They map to `logo` and `logoDark`.
The separate 1024×1024 Composer PNGs map to `composerIcon` and
`composerIconDark`; see the table above. All four participate in release-input
hashing and are copied into each OpenAI archive without rewriting.

The catalog PWA `site/public/icon-512.png` was not replaced.

## Recorded public identity

- public developer name `servrox solutions UG`
- public Platform plugin slug remains available through the public ChatGPT URL

Directory identity is a manual `pnpm run verify:openai-directory` diagnostic
covering the directory document (`DIR-001`) and public category-catalog
membership (`DIR-002`). The scheduled workflow and composite action were removed;
see [manual directory observation](../../publishing.md#manual-directory-observation)
for the 2026-09-25 access failures and missing catalog entry. These first-publication
observations are historical and do not establish current catalog membership.
Deterministic hosted `Validate` does not fetch the live directory.

Regenerate
[`stark-ai-developer-release-evidence.json`](stark-ai-developer-release-evidence.json)
only from a clean working tree whose `HEAD` has an exact Git tag. The committed
first-publication evidence remains historical. Use the matching tagged release
and generated handoff for each current upload; a dirty or untagged evidence
write is not a freeze.

## Do not

- add `listing.availability` or claim a Germany-only directory geo-fence or worldwide availability
- invent a second Codex public directory URL or README badge
- copy the in-product OpenAI Verified mark onto the README or site
- map `chatgptPlugin` into OpenAI `websiteURL`
- write portal glyph names into `agents/openai.yaml`
- insert U+200A into OpenAI `displayName` unless explicitly requested
- hand-edit `plugins/stark-ai-developer/`
- upload the portable Agent Plugins zip to the OpenAI portal
- regenerate or rewrite committed freeze evidence except from a clean tagged identity
- commit secrets, reviewer transcripts, or machine-specific paths
- invent a portal URL that downloads the saved `.codex-plugin/plugin.json`
- log ChatGPT directory-document account identifiers, cookies, session tokens, or category catalog `pageToken` values

## Metadata MCP candidate and fallback handoff

ADR-0076 supersedes ADR-0071 for parallel OpenAI profiles; ADR-0072 defines the shared metadata core. See the [metadata MCP qualification guide](../../../packages/skill-metadata-mcp/README.md) for build, archive verification, Vercel configuration and manual fallback rules. Each existing public listing remains authoritative until its update is verified as published. Do not treat a successful ZIP check, prepared endpoint or open pull request as portal acceptance.
