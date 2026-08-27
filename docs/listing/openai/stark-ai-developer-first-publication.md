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

## Observed listing

The public ChatGPT plugin page is:

https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e

The public listing id parsed from that URL is
`plugins_6a85d98a7bc48191879aedd91610271e`. Observed 2026-08-21: that same
token is the Platform plugin ID in Apps Management. It is not the portal
submission ID. The submission ID is `appsub_6a85d98ac104819182577e9e918db23d`.

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
For every current update, wait for successful exact-tag Post-release Evidence,
download the direct GitHub Release asset named `openai.zip`, and upload those
exact bytes. Do not upload the portable Agent Plugins archive or a GitHub source
archive. See `docs/publishing.md#operator-follow-up` for the current handoff.

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

Recorded 2026-08-21 from the logged-in Apps Management submission page. This
URL requires Platform login and is not a public listing URL:

https://platform.openai.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e/submissions/appsub_6a85d98ac104819182577e9e918db23d

| Identifier           | Value                                      |
| -------------------- | ------------------------------------------ |
| Platform plugin ID   | `plugins_6a85d98a7bc48191879aedd91610271e` |
| Portal submission ID | `appsub_6a85d98ac104819182577e9e918db23d`  |

No separate draft ID appeared in that URL. Do not copy this Platform URL into
public listing fields, README badges, or `.codex-plugin/plugin.json`. The
submission page shows a visual JSON representation; OpenAI documents no URL
that exports the saved portal `plugin.json`. That file is not a v1 launch
gate.

### Country picker

The live plugin portal no longer exposes a publisher country or region picker.
The listing source therefore omits `availability` entirely. Do not store an
empty region list, leftover `DE`, or a worldwide-availability claim. Directory
reach is controlled by OpenAI and the installing account, workspace, plan, and
client. Publisher legal seat remains Germany on the imprint and terms pages.
Do not add `listing.availability` unless a later portal build collects that
field again.

### Skill metadata warnings

Upload produced six non-blocking `skill_metadata_ignored` warnings.
`SKILL.md` `metadata:` (`author`, `category`, `version`) is ignored for the
OpenAI plugin interface. The interface lives in `agents/openai.yaml`. Do not
strip `SKILL.md` metadata to silence the warning.

### Safety and security scan

OpenAI documents up to two hours per bundled-skill safety/security scan. That
scan is distinct from unbounded human review and from Codex Security scans.
Human review has no published ETA.

### Portal skill glyphs

Apps Management exposes a twelve-icon picker on the plugin draft. Glyph names
come from the control `aria-label` (`Use chat icon` → `chat`):

`default`, `bolt`, `chart`, `chat`, `code`, `cursor`, `heart`, `hierarchy`,
`pdf`, `pen`, `radar`, `search`

These names are portal-only. Pin the reviewed glyph for each skill as
`listing.skills[].portalGlyph` for `npm run verify:openai-directory`. Do not
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

Each bundled skill now ships `assets/openai-icon.png` and references it unchanged
for `icon_small` and `icon_large`. The OpenAI plugin manifest separately supports
one `logo`, one `composerIcon`, and brand colors. The public documentation does
not define separate light and dark Plugin Info logo fields in the package, does
not guarantee that a portal glyph survives a package update, and documents no
public publication API. Therefore the portal inspection remains mandatory:

1. verify all six skill icons and restore the reviewed portal glyphs if needed;
2. upload `site/public/logo.png` as the light Plugin Info logo;
3. upload `site/public/logo-dark.png` as the dark Plugin Info logo and Composer icon;
4. verify light/dark rendering and directory identity after propagation.

See [Build plugins](https://developers.openai.com/plugins/build/plugins) and
[Submit and publish plugins](https://developers.openai.com/plugins/deploy/submission).

## Brand assets

Official 2048×2048 PNGs from the stark-ai.de landing page were copied
byte-identical into `site/public/logo.png` (light) and
`site/public/logo-dark.png` (dark). Listing `logo` maps to the light file and
`composerIcon` maps to the dark file. The packager copies them into the OpenAI
archive as `assets/logo.png` and `assets/composer-icon.png` without rewriting.

The catalog PWA `site/public/icon-512.png` was not replaced.

## Recorded identifiers

- OpenAI organization ID `org-dz0kZIfZpiaMc7YFjxGcsrk7`
- verified identity: individual, Marcel Michael Mayer
- public developer name `servrox solutions UG`
- Platform plugin ID `plugins_6a85d98a7bc48191879aedd91610271e`
- portal submission ID `appsub_6a85d98ac104819182577e9e918db23d`

Directory identity is `npm run verify:openai-directory` locally and the strict
`ChatGPT Directory Identity` workflow after publication on a schedule or manual
dispatch, through `.github/actions/verify-openai-directory`. Deterministic hosted
`Validate` does not fetch the live directory. That gate covers the directory
document (`DIR-001`) and public category-catalog membership (`DIR-002`).

Regenerate
[`stark-ai-developer-release-evidence.json`](stark-ai-developer-release-evidence.json)
only from a clean working tree whose `HEAD` has an exact Git tag. The latest
published GitHub baseline is `v0.20.1`. A dirty or untagged evidence write is
not a freeze.

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
