# stark AI Developer listing values review

Status: Public listing values remain derived from the machine-readable listing. Dated portal observations remain historical evidence. Directory identity is a manual
`pnpm run verify:openai-directory` diagnostic (`DIR-001` document, `DIR-002` category catalog).
See [manual directory observation](../../publishing.md#manual-directory-observation)
for the current limitations and dated evidence.

The machine-readable source of truth is
[`stark-ai-developer.json`](stark-ai-developer.json). Generated manifests and
public release handoff issues must be derived from that file. Portal and product-surface
observations after the first listing live in
[`stark-ai-developer-first-publication.md`](stark-ai-developer-first-publication.md).

## Accepted capability addition

Jev Capability Advisor adds a seventh, Codex-only workflow. Its optional TypeSafe request uses the user's own API key and transfers supplied task text plus bounded public capability descriptions. Offline inspection remains available. This document does not assert a portal submission, approval, or publication state.

## Recommended values

| Field                  | Pick                                                                   | Why                                                                                                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public display name    | `stark AI Developer`                                                   | Matches the existing bundle display name and product brand.                                                                                                                                                                                         |
| Package/plugin name    | `stark-ai-developer`                                                   | Matches the repository distribution IDs and safe kebab-case naming.                                                                                                                                                                                 |
| Initial plugin version | `1.0.0`                                                                | This is the first public plugin package; it is independent of the repository package version.                                                                                                                                                       |
| Developer identity     | `servrox solutions UG`                                                 | Matches the declared legal author in `package.json` and is the public developer name. Account-level verification records remain in the private portal workflow.                                                                                     |
| Product brand          | `stark AI`                                                             | Matches existing site and repository branding while keeping the legal developer name separate.                                                                                                                                                      |
| Short description      | `Harness-first toolkit`                                                | Fits the final directory limit and names the harness-first developer workflow toolkit without the skills-only packaging label.                                                                                                                      |
| Category               | `Developer Tools`                                                      | Best fit for specifications, architecture, code-search, diagrams, documentation assets, and Codex memory.                                                                                                                                           |
| Light brand color      | `#0021C7`                                                              | Existing site token with strong contrast on white.                                                                                                                                                                                                  |
| Dark brand color       | `#7FA0FF`                                                              | Existing site token with readable contrast on a dark surface.                                                                                                                                                                                       |
| Logo                   | `site/public/logo.png`                                                 | Official stark-ai.de light square mark (2048 PNG); copied into the packaged OpenAI archive as `assets/logo.png` without rewriting.                                                                                                                  |
| Composer icon          | `site/public/logo-dark.png`                                            | Official stark-ai.de dark square mark (2048 PNG); copied into the packaged OpenAI archive as `assets/composer-icon.png` without rewriting.                                                                                                          |
| ChatGPT plugin page    | `https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e` | Public ChatGPT plugin linkout for the shared ChatGPT/Codex catalog. The public listing slug remains in the public URL; authenticated portal records stay private. Catalog website, privacy, terms, support, and security URLs stay on GitHub Pages. |

The capabilities, three starter prompts, URLs, release notes, routing
policies, and skills-only boundary are maintained in the JSON source. The
`animated-readme-logo` capability is deliberately framed as developer
documentation and repository presentation so the skill has a coherent place in
the toolkit.

## Portal skill glyphs

Keep the Apps Management glyph table and Codex Skills-list observation in
[`stark-ai-developer-first-publication.md`](stark-ai-developer-first-publication.md).
Those names are portal-only. Pin them as `portalGlyph` in listing JSON for the
directory check. Do not write them into `agents/openai.yaml`.

## Boundary and legal review

The package is skills-only. It has no shared backend, bundled MCP server,
telemetry or analytics. Jev uses an optional, declared TypeSafe connection with
the user's own API key; offline inspection needs neither network nor credentials. Host, workspace, repository, and tool processing remain subject to
the installing client's policies and are not promises made by this package.

Public routes on the existing GitHub Pages site:

- Plugin: `https://stark-ai-de.github.io/agent-skills/plugins/stark-ai-developer/`
- Privacy: `https://stark-ai-de.github.io/agent-skills/privacy/`
- Terms: `https://stark-ai-de.github.io/agent-skills/terms/`
- Support: `https://stark-ai-de.github.io/agent-skills/support/`
- Security: `https://stark-ai-de.github.io/agent-skills/security/`

ChatGPT plugin page:

- `https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e`

GitHub Pages plugin, privacy, terms, support, and security URLs returned HTTP
200 during first publication. The ChatGPT plugin page is live.

No secret, token, cookie, private reviewer communication, or customer data may
be added to this report or its generated evidence.
