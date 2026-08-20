# First publication notes: stark AI Developer

Observed 2026-08-19 after the first public OpenAI plugin listing. This file is
the repository source for those portal and product-surface observations. Phase 6
listing is complete. This file is not freeze evidence, not a portal draft
identifier, and not remaining-launch lifecycle proof.

Listing copy remains
[`stark-ai-developer.json`](stark-ai-developer.json). Recommended values remain
[`stark-ai-developer-values-review.md`](stark-ai-developer-values-review.md).
Committed freeze hashes remain
[`stark-ai-developer-release-evidence.json`](stark-ai-developer-release-evidence.json)
until a maintainer regenerates that file from a clean tagged identity.

Do not add secrets, tokens, cookies, private reviewer messages, customer data,
or machine-specific paths here.

## Observed listing

The public ChatGPT plugin page is:

https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e

The public listing id parsed from that URL is
`plugins_6a85d98a7bc48191879aedd91610271e`. That slug is not a portal draft or
submission identifier.

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

Upload the OpenAI-native archive from `dist/openai/`, the zip that contains
`.codex-plugin/plugin.json`. Do not upload the portable Agent Plugins archive
from `dist/agent-plugins/`.

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

These names are portal-only. They are not listing JSON fields and must not be
written into `agents/openai.yaml`. Optional `icon_small` / `icon_large` image
paths inside a skill interface are a separate, unused mechanism. Do not invent
a named-palette key such as `icon: chat`.

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

### Codex Skills list icons

No per-skill icons ship in the package. In the Codex Skills list, four
engineering skills showed OpenAI's default cube. `codex-memory-curator` and
`codex-spec-interviewer` showed Codex host chrome (cloud and `>_`). Codex
appears to special-case `codex-*` display names. Keep this split as-is. Portal
glyphs do not appear in that Codex list. Do not add `icon_small` / `icon_large`
to silence it.

## Brand assets

Official 2048×2048 PNGs from the stark-ai.de landing page were copied
byte-identical into `site/public/logo.png` (light) and
`site/public/logo-dark.png` (dark). Listing `logo` maps to the light file and
`composerIcon` maps to the dark file. The packager copies them into the OpenAI
archive as `assets/logo.png` and `assets/composer-icon.png` without rewriting.

The catalog PWA `site/public/icon-512.png` was not replaced.

## Remaining launch evidence

Recorded 2026-08-20 from Apps Management:

- OpenAI organization ID `org-dz0kZIfZpiaMc7YFjxGcsrk7`
- verified identity: individual, Marcel Michael Mayer
- public developer name remains `servrox solutions UG`

Still remaining:

- Apps Management permission recorded in sanitized evidence
- portal-normalized manifest, accepted diff, and portal draft/submission IDs
- clean tagged freeze after the logo swap, listing URL, and publisher-identity changes
- signed release-tag provenance (annotated `v0.19.1` has no GPG signature and no artifact attestation; add Sigstore attestations with `.github/workflows/attest-release.yml` on the next GitHub Release or by dispatching that workflow against a tag)
- live ChatGPT/Codex repeated-trial evaluations against recorded thresholds (2026-08-20 attempt recorded in [`skill-evals/stark-ai-developer/evidence/live-repeated-trials.md`](../../../skill-evals/stark-ai-developer/evidence/live-repeated-trials.md); ChatGPT web tab vanished before login, Codex desktop was not running, Codex CLI lacked the public plugin; `reliability-thresholds.json` stays `not_run`; 0 of 18 manifest cases and 0 threshold trials observed)
- sanitized supported-client add, enable, update, disable, and remove matrix
- clean-account install, invoke, and uninstall on every supported v1 surface

Maintainer reported a post-release manual client lifecycle test on 2026-08-20.
That report does not replace a sanitized per-surface matrix. Do not infer
ChatGPT desktop, mobile, or clean-account results from it.

Do not regenerate
[`stark-ai-developer-release-evidence.json`](stark-ai-developer-release-evidence.json)
except from a clean working tree whose `HEAD` has an exact Git tag. `plugin-released`
/`main` at `19c0829`/`a5232ae` is not tagged; the latest GitHub tag remains `v0.19.1`
on `35101f2`. A dirty or untagged evidence write is not a freeze.

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
