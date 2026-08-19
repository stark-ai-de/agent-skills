# stark AI Developer listing values review

Status: repository-local draft for manual values review. This is not evidence of
OpenAI verification, approval, publication, or public-directory visibility.

The machine-readable source of truth is
[`stark-ai-developer.json`](stark-ai-developer.json). Generated manifests and
submission worksheets must be derived from that file.

## Recommended values

| Field                  | Pick                          | Why                                                                                                       |
| ---------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| Public display name    | `stark AI Developer`          | Matches the existing bundle display name and product brand.                                               |
| Package/plugin name    | `stark-ai-developer`          | Matches the repository distribution IDs and safe kebab-case naming.                                       |
| Initial plugin version | `1.0.0`                       | This is the first public plugin package; it is independent of the repository package version.             |
| Developer identity     | `servrox solutions UG`        | Matches the declared legal author in `package.json`; no OpenAI organization identity is invented.         |
| Product brand          | `stark AI`                    | Matches existing site and repository branding while keeping the legal developer name separate.            |
| Short description      | `Developer workflow toolkit`  | Fits the final directory limit and accurately covers all six workflows.                                   |
| Category               | `Developer Tools`             | Best fit for specifications, architecture, code-search, diagrams, documentation assets, and Codex memory. |
| Availability           | Germany (`DE`) pending review | Conservative initial scope while legal, publisher, account, and regional availability are reviewed.       |
| Light brand color      | `#0021C7`                     | Existing site token with strong contrast on white.                                                        |
| Dark brand color       | `#7FA0FF`                     | Existing site token with readable contrast on a dark surface.                                             |
| Logo/composer asset    | `site/public/icon-512.png`    | Existing square repository branding asset; copied into the packaged OpenAI archive without rewriting.     |

The six capabilities, three starter prompts, URLs, release notes, routing
policies, and skills-only boundary are maintained in the JSON source. The
`animated-readme-logo` capability is deliberately framed as developer
documentation and repository presentation so the skill has a coherent place in
the toolkit.

## Boundary and legal review

The package is skills-only. It has no backend, MCP server, connectors,
authentication, telemetry, analytics, hidden network calls, or runtime
downloads. Host, workspace, repository, and tool processing remain subject to
the installing client's policies and are not promises made by this package.

Proposed public routes on the existing GitHub Pages site:

- Plugin: `https://stark-ai-de.github.io/agent-skills/plugins/stark-ai-developer/`
- Privacy: `https://stark-ai-de.github.io/agent-skills/privacy/`
- Terms: `https://stark-ai-de.github.io/agent-skills/terms/`
- Support: `https://stark-ai-de.github.io/agent-skills/support/`
- Security: `https://stark-ai-de.github.io/agent-skills/security/`

These URLs are repository-local planned surfaces until live HTTPS and content
ownership are manually verified. Confirm the final legal publisher name,
support contact, privacy controller, terms jurisdiction, security-report
address, domain ownership, and permitted countries before submission.

## Required manual decisions

The following values remain intentionally unresolved:

- verified OpenAI organization or individual identity;
- OpenAI organization ID and Apps Management permission;
- final public publisher display name and contact details;
- legal approval of the privacy policy, terms, support, and security routes;
- final regions/countries and account/workspace availability;
- portal-normalized manifest and accepted normalization diff;
- submission archive, portal draft ID, review result, approval, and publication status.
- live HTTPS verification for every listed URL;
- supported-client add, enable, update, disable, and remove lifecycle evidence.

No secret, token, cookie, private reviewer communication, or customer data may
be added to this report or its generated evidence.
