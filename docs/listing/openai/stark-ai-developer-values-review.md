# stark AI Developer listing values review

Status: Phase 6 listing observed. Remaining launch evidence is still pending.
This file is still not freeze evidence, verified-identity proof, or
clean-account lifecycle proof.

The machine-readable source of truth is
[`stark-ai-developer.json`](stark-ai-developer.json). Generated manifests and
submission worksheets must be derived from that file. Portal and product-surface
observations after the first listing live in
[`stark-ai-developer-first-publication.md`](stark-ai-developer-first-publication.md).

## Recommended values

| Field                  | Pick                                                                   | Why                                                                                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public display name    | `stark AI Developer`                                                   | Matches the existing bundle display name and product brand.                                                                                                                                                                                                      |
| Package/plugin name    | `stark-ai-developer`                                                   | Matches the repository distribution IDs and safe kebab-case naming.                                                                                                                                                                                              |
| Initial plugin version | `1.0.0`                                                                | This is the first public plugin package; it is independent of the repository package version.                                                                                                                                                                    |
| Developer identity     | `servrox solutions UG`                                                 | Matches the declared legal author in `package.json`; no OpenAI organization identity is invented.                                                                                                                                                                |
| Product brand          | `stark AI`                                                             | Matches existing site and repository branding while keeping the legal developer name separate.                                                                                                                                                                   |
| Short description      | `Developer workflow toolkit`                                           | Fits the final directory limit and accurately covers all six workflows.                                                                                                                                                                                          |
| Category               | `Developer Tools`                                                      | Best fit for specifications, architecture, code-search, diagrams, documentation assets, and Codex memory.                                                                                                                                                        |
| Light brand color      | `#0021C7`                                                              | Existing site token with strong contrast on white.                                                                                                                                                                                                               |
| Dark brand color       | `#7FA0FF`                                                              | Existing site token with readable contrast on a dark surface.                                                                                                                                                                                                    |
| Logo                   | `site/public/logo.png`                                                 | Official stark-ai.de light square mark (2048 PNG); copied into the packaged OpenAI archive as `assets/logo.png` without rewriting.                                                                                                                               |
| Composer icon          | `site/public/logo-dark.png`                                            | Official stark-ai.de dark square mark (2048 PNG); copied into the packaged OpenAI archive as `assets/composer-icon.png` without rewriting.                                                                                                                       |
| ChatGPT plugin page    | `https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e` | Public ChatGPT plugin linkout for the shared ChatGPT/Codex catalog. Public listing id parsed from the URL: `plugins_6a85d98a7bc48191879aedd91610271e` (not a portal draft id). Catalog website, privacy, terms, support, and security URLs stay on GitHub Pages. |

The six capabilities, three starter prompts, URLs, release notes, routing
policies, and skills-only boundary are maintained in the JSON source. The
`animated-readme-logo` capability is deliberately framed as developer
documentation and repository presentation so the skill has a coherent place in
the toolkit.

## Portal skill glyphs

Keep the Apps Management glyph table and Codex Skills-list observation in
[`stark-ai-developer-first-publication.md`](stark-ai-developer-first-publication.md).
Those names are portal-only. Do not write them into `agents/openai.yaml`.

## Boundary and legal review

The package is skills-only. It has no backend, MCP server, connectors,
authentication, telemetry, analytics, hidden network calls, or runtime
downloads. Host, workspace, repository, and tool processing remain subject to
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
200 during first publication. The ChatGPT plugin page is live. Confirm the legal
publisher name, support contact, privacy controller, terms jurisdiction,
security-report address, and domain ownership before any later update.

## Remaining launch evidence

The following values remain intentionally unresolved after Phase 6 listing:

- verified OpenAI organization or individual identity;
- OpenAI organization ID and Apps Management permission;
- final public publisher display name and contact details;
- legal approval recorded in-repo for privacy, terms, support, and security routes;
- account, workspace, plan, and client availability matrix;
- portal-normalized manifest and accepted normalization diff;
- sanitized portal draft ID and review identifiers;
- clean tagged freeze after the logo swap and listing URL changes;
- supported-client add, enable, update, disable, and remove lifecycle evidence;
- clean-account install, invoke, and uninstall on every supported v1 surface.

No secret, token, cookie, private reviewer communication, or customer data may
be added to this report or its generated evidence.
