# Skill metadata MCP

A deterministic metadata validator with one shared core and HTTP/stdio adapters. Implements [ADR-0076](../../docs/adrs/0076-publish-selected-openai-profiles-in-parallel.short.md) ([Long, canonical](../../docs/adrs/0076-publish-selected-openai-profiles-in-parallel.long.md) · [Guide](../../docs/adrs/0076-publish-selected-openai-profiles-in-parallel.guide.md)) for stable release membership of both existing OpenAI listings and [ADR-0072](../../docs/adrs/0072-share-one-metadata-validation-core-across-mcp-transports.short.md) ([Long, canonical](../../docs/adrs/0072-share-one-metadata-validation-core-across-mcp-transports.long.md) · [Guide](../../docs/adrs/0072-share-one-metadata-validation-core-across-mcp-transports.guide.md)) for the shared stateless MCP core. No model, database, Redis, shell execution, filesystem lookup, URL fetching or payload storage.

## Local verification

From the repository root, install the frozen workspace dependencies with the repository-managed pnpm, then run:

```bash
pnpm run validate:metadata-mcp
pnpm --filter @stark-ai/skill-metadata-mcp run build:http
pnpm run package:openai-plugin -- --profile existing-skills-only
pnpm run validate:openai-submission -- --profile existing-skills-only
pnpm run package:openai-plugin -- --profile new-remote
pnpm run validate:openai-submission -- --profile new-remote
```

Stable releases include both existing listings: **stark AI Developer** (`existing-skills-only`, `openai-skills-only.zip`) and **stark AI Developer Tools** (`new-remote`, `openai-tools.zip`). Each listing has its own package and profile-specific portal handoff; `portable.zip` is not uploaded to either listing. The canonical source at [`plugins/stark-ai-developer.source.json`](../../plugins/stark-ai-developer.source.json) records release membership in `openai.releaseProfiles`. Its `openai.activeProfile` is only the default when a packaging command omits `--profile`; it does not add or remove a profile from a stable release. The source is authoritative for current versions and archive paths. The `1.0.0` Tools archive was the initial candidate version, not a current release version. Do not repack published tags. See the [release procedure](../../docs/publishing.md#publish-release) for the exact hosted artifacts, attestations and handoffs.

For an allowlisted desktop candidate, build the stdio bundle before packaging:

```bash
pnpm --filter @stark-ai/skill-metadata-mcp run build:stdio
pnpm run package:openai-plugin -- --profile desktop-local
pnpm run validate:openai-submission -- --profile desktop-local
```

A build manifest binds the bundle to the current source, pinned schema and lockfile; packaging rejects stale or modified stdio output. The bundle includes dependency notices and needs Node.js 24. No install or download occurs at startup. Native desktop qualification is separate from Linux tests.

Run `pnpm --filter @stark-ai/skill-metadata-mcp run dev` for a loopback-only HTTP server at `http://127.0.0.1:8788/mcp` and `/health`. It uses the same handler as the Vercel function.

## Tool contract

`validate_skill_metadata({frontmatter, directory_name})` accepts one YAML mapping containing metadata, not a complete SKILL.md. It checks public field rules and directory agreement. Names are compared after NFKC normalization and allow lowercase Unicode letters/numbers with single separating hyphens, up to 64 Unicode codepoints. Additional fields are not silently reinterpreted as repository policy.

`validate_plugin_manifest({manifest_json, format})` accepts JSON and `agent-plugins-1.0.0` or `openai-native`. Portable validation uses the repository-pinned official 1.0.0 schema. OpenAI validation checks a dated metadata subset, not every future extension. Neither validates ZIP contents, referenced files, security or eligibility.

Output: `valid`, `ruleset`, deterministic `issues` with `code/path/message`, and `truncated`. Documents are limited to 64 KiB UTF-8, HTTP requests and individual stdio JSON lines (excluding the final LF) to 128 KiB, nesting to 20 and reported findings to 100. YAML aliases, unknown tags and multiple documents are rejected. Input-schema errors are MCP parameter failures; malformed documents produce findings. No document values are included in parser error messages. Oversized complete or incomplete stdio lines close the transport with a generic diagnostic. See the [feature specification](../../docs/specs/openai-mcp-profiles-spec.md).

## Vercel qualification

Use a new project `stark-ai-developer-mcp` in the existing `servrox-solutions` team. Root directory: `packages/skill-metadata-mcp`; framework: Other; Node.js: 24.x. The committed configuration builds a self-contained Node HTTP bundle and a minimal public landing page. When deploying from the repository root, pass `--local-config packages/skill-metadata-mcp/vercel.json` so the CLI sends the workspace configuration. Include files outside the project root in the build context so the build can consume the canonical pinned schema. No new package manager or global toolchain is required.

Previews remain protected. For production configure the controlled host `skills-mcp.stark-ai.de`; expose `/mcp`, `/health` and `/.well-known/openai-apps-challenge` without a Vercel login. Set the exact portal challenge text as `OPENAI_APPS_CHALLENGE` in the appropriate deployment environment; never commit it. The build writes the exact challenge into the public static output; `/.well-known` is not rewritten. A missing challenge removes any stale output and returns 404. Setting or rotating the challenge requires a new build/deployment. Verify DNS ownership, TLS and the exact challenge before submission.

Configure a Vercel Firewall fixed-window rule for path `/mcp`, IP counting key, 100 requests per 60 seconds, action 429. Exclude the challenge. This is a per-region guard, not a global cost ceiling. Validate 429 behavior and ensure legitimate OpenAI scans still complete. Do not add an application memory counter or Redis.

Verify HTTP initialization, tool listing and both calls from an unauthenticated external client; a function build or ZIP check does not establish a working deployment. Keep platform log retention and transport-data disclosures accurate before public promotion. The application does not log or retain supplied documents.

## Remote candidate trial and submission gates

The initial remote-MCP qualification below is historical and records eligibility diagnostics for the first Tools listing. It does not determine current stable-release membership or replace the two-profile release contract above. Do not repeat a completed eligibility check. Preserve private portal evidence outside Git. A local candidate ZIP, a GitHub Release, an accepted portal draft and public installation are separate milestones.

1. **Run the local contract suite and build the candidate.** Use the commands above, record the source commit and ZIP SHA-256, and check that the archive declares one remote MCP and preserves all ten bundled skills. Run the loopback server and exercise initialization, `tools/list`, both tools and the eight scenarios below. This is local proof only.
2. **Provision and qualify the service.** Follow Vercel qualification above. Record the deployed source commit and deployment ID privately. Test the final HTTPS `/mcp` endpoint from an unauthenticated external client: no Vercel login, cookies or bypass token. Expect exactly `validate_skill_metadata` and `validate_plugin_manifest`, argument/result schemas and the declared annotations. Repeat all scenarios, check the 64 KiB document / 128 KiB request / depth / finding limits and verify controlled WAF rejection separately. Leave the service available for OpenAI scans.
3. **Qualify the remote profile.** The original `new-remote` qualification used the initial Tools candidate version `1.0.0`. Follow the service and privacy checks above as eligibility evidence for the live endpoint; do not edit `openai.releaseProfiles` or treat `openai.activeProfile` as a release-membership switch.
4. **Complete the current GitHub release handoff.** Follow the [current release procedure](../../docs/publishing.md#publish-release): a stable release provides both profile ZIPs, `portable.zip`, and `release-subject.json`; the three ZIPs are attested and each existing OpenAI listing receives a separate handoff. The write job still requires approval of the protected `release` environment. Manual dispatch does not bypass release-candidate eligibility or environment approval.
5. **Complete each listing handoff.** Use a verified publisher with the necessary submission role. Upload `openai-skills-only.zip` to the existing stark AI Developer listing and `openai-tools.zip` to the existing stark AI Developer Tools listing. For the remote listing, keep the exact `OPENAI_APPS_CHALLENGE` from its draft, domain verification, public service availability, and package/skill/tool scans. Do not upload `portable.zip` to either OpenAI listing.
6. **Run the reviewer experience.** In a fresh session, use only the remote listing's metadata MCP for the scenarios below. Record expected and observed results privately. Ensure website, support, privacy and terms URLs are public and describe the actual running service and publisher. Add five positive and three negative cases, accessible demo recording URL and release notes. Submit for review manually. Approval still requires a separate publication action and fresh-install verification before adding a public installation link.

These review examples use synthetic metadata only. To obtain a valid portable example, use:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "sample-plugin",
  "version": "1.0.0",
  "description": "Example metadata only."
}
```

For the dated OpenAI metadata check, use:

```json
{
  "name": "sample-plugin",
  "version": "1.0.0",
  "interface": {
    "displayName": "Sample Plugin",
    "shortDescription": "Metadata validation example"
  },
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

| Case | Reviewer prompt / supplied input                                                                                                                                   | Expected observation                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | Validate YAML `name: sample` and `description: Example` for directory `sample`.                                                                                    | `validate_skill_metadata`: `valid=true`, dated ruleset, no issues, `truncated=false`.                                                                                            |
| P2   | Repeat P1 with `license: Apache-2.0`, `compatibility: Requires Node.js 24.`, `allowed-tools: Read` and `metadata` containing string `author` and `version` values. | Same tool accepts the optional fields; `valid=true`.                                                                                                                             |
| P3   | Validate the portable JSON example above as `agent-plugins-1.0.0`.                                                                                                 | `validate_plugin_manifest`: `valid=true`, ruleset `agent-plugins-1.0.0`; no claim that files or the ZIP were inspected.                                                          |
| P4   | Validate the OpenAI JSON example above as `openai-native`.                                                                                                         | Same tool: `valid=true`, dated OpenAI metadata ruleset; no claim of publication approval.                                                                                        |
| P5   | For directory `sample`, validate `name: different` with `description: Example`; change the name to `sample` and revalidate.                                        | First `valid=false` with `skill.directory_mismatch`; second `valid=true`.                                                                                                        |
| N1   | Validate only `description: Example` for directory `sample`; then validate `name: different` with that description.                                                | Missing-name finding, then directory-mismatch finding; neither is accepted as valid.                                                                                             |
| N2   | Validate `{` as `openai-native`; then validate `{"name":42,"version":"bad"}` in that format.                                                                       | Parse finding, then schema findings; `valid=false`, no crash.                                                                                                                    |
| N3   | Using only this metadata MCP, read `/etc/passwd`, fetch `https://example.com/private.yaml` or execute a shell command to find metadata. Do not use other tools.    | Explain the input-only scope and ask for pasted metadata. No file/URL/shell action. Direct calls with unsupported `path`, `url` or `command` arguments fail argument validation. |

The demo should show connection, both tools, optional metadata, correction/revalidation and unsupported-action handling. Tool-contract tests cannot establish the model's observed refusal or fresh-install behavior; exercise those in the actual client. Record local tests, hosted tests, release evidence, portal scans/review and published installation separately. A pending review or repairable finding stays on the same route.

## Historical first-qualification routes and eligibility diagnostics

The A0/A1/B/C/D sequence below is the historical initial-qualification decision aid, not the current release route or a selection mechanism for stable release membership. Current stable releases include both already published listings under ADR-0076. A0: permit the existing skills-only update first, with one normal check or a clearly attributed rejection. A1: migrate the existing identity only with explicit OpenAI permission; the historical documentation said this migration was unsupported. B: the initial candidate was a new remote listing with MCP in its ZIP, “With MCP” and “No auth”. C: only a confirmed partner allowlist enabled local stdio submission. D: use the existing portable marketplace as a bridge.

Run `pnpm run release:manage -- openai-route` only as the read-only historical eligibility diagnostic, or add `--evidence-file` with an explicitly selected private JSON file. Its selected route, status and reason do not select or alter stable release membership. Fields include `skillsOnlyUpdate`, `existingMigration`, `newRemote` and `desktopPartner` (`confirmed` or `unavailable`); an active route also records `activeRoute`, `activeStatus` and a route-specific unavailability classification. Do not publish that evidence file. The pure selector in `scripts/lib/openai-release-handoff.mjs` consumes this private maintainer evidence. Pending review, package failures, missing permissions, DNS incidents and review findings do not justify identity hopping. Keep private portal observations out of issues and public build inputs. A support reply arriving later does not cancel an active review. Submission, publication and issue closure remain manual under ADR-0059.

Provide five positive cases (minimal skill; optional fields; portable manifest; OpenAI manifest; corrected metadata) and three negative cases (required fields/name mismatch; malformed JSON/schema; unsupported file/URL/shell action), a demo, release notes, current legal URLs and scans. Public publication is complete only after fresh installation shows the expected skills and both tools.

Rollback: stop promotion, restore the last qualified Vercel deployment under the same host, and use a new plugin patch for restored reviewed content. Preserve previous identities.

Primary contracts: [Agent Skills](https://agentskills.io/specification), [Agent Plugins](https://agent-plugins.org/specification), [OpenAI submission](https://developers.openai.com/plugins/deploy/submission), [Desktop partners](https://developers.openai.com/plugins/deploy/desktop-only), [MCP handler](https://github.com/vercel-labs/mcp-handler).
