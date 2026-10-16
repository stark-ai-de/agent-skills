# Skill metadata MCP

A deterministic metadata validator with one shared core and HTTP/stdio adapters. Implements ADR-0071 and ADR-0072. No model, database, Redis, shell execution, filesystem lookup, URL fetching or payload storage.

## Local verification

From the repository root, install the frozen workspace dependencies with the repository-managed pnpm, then run:

```bash
pnpm run validate:metadata-mcp
pnpm --filter @stark-ai/skill-metadata-mcp run build:http
pnpm run package:openai-plugin -- --profile new-remote
pnpm run validate:openai-submission -- --profile new-remote
```

The explicit profile creates `dist/openai/stark-ai-developer-tools-1.0.0.zip`. It does not alter the selected release profile. The canonical source selects `new-remote` after the existing update was rejected and the public HTTP service was qualified. To select a profile for a release, update `openai.activeProfile`, `distributions.openaiPlugin` and `outputs.openaiArchive` together in the canonical plugin source; run sync and all release checks. Do not repack published tags.

For an allowlisted desktop candidate, build the stdio bundle before packaging:

```bash
pnpm --filter @stark-ai/skill-metadata-mcp run build:stdio
pnpm run package:openai-plugin -- --profile desktop-local
pnpm run validate:openai-submission -- --profile desktop-local
```

A build manifest binds the bundle to the current source, pinned schema and lockfile; packaging rejects stale or modified stdio output. The bundle includes dependency notices and needs Node.js 24. No install or download occurs at startup. Native desktop qualification is separate from Linux tests.

Run `pnpm --filter @stark-ai/skill-metadata-mcp run dev` for a loopback-only HTTP server at `http://127.0.0.1:8788/mcp` and `/health`. It uses the same handler as the Vercel function.

## Tool contract

`validate_skill_metadata({frontmatter, directory_name})` accepts one YAML mapping containing metadata, not a complete SKILL.md. It checks public field rules and directory agreement. Additional fields are not silently reinterpreted as repository policy.

`validate_plugin_manifest({manifest_json, format})` accepts JSON and `agent-plugins-1.0.0` or `openai-native`. Portable validation uses the repository-pinned official 1.0.0 schema. OpenAI validation checks a dated metadata subset, not every future extension. Neither validates ZIP contents, referenced files, security or eligibility.

Output: `valid`, `ruleset`, deterministic `issues` with `code/path/message`, and `truncated`. Documents are limited to 64 KiB UTF-8, requests to 128 KiB, nesting to 20 and reported findings to 100. YAML aliases, unknown tags and multiple documents are rejected. Input-schema errors are MCP parameter failures; malformed documents produce findings. No document values are included in parser error messages.

## Vercel qualification

Use a new project `stark-ai-developer-mcp` in the existing `servrox-solutions` team. Root directory: `packages/skill-metadata-mcp`; framework: Other; Node.js: 24.x. The committed configuration builds a self-contained Node HTTP bundle and a minimal public landing page. When deploying from the repository root, pass `--local-config packages/skill-metadata-mcp/vercel.json` so the CLI sends the workspace configuration. Include files outside the project root in the build context so the build can consume the canonical pinned schema. No new package manager or global toolchain is required.

Previews remain protected. For production configure the controlled host `skills-mcp.stark-ai.de`; expose `/mcp`, `/health` and `/.well-known/openai-apps-challenge` without a Vercel login. Set the exact portal challenge text as `OPENAI_APPS_CHALLENGE` in the appropriate deployment environment; never commit it. A missing challenge returns 404. Verify DNS ownership, TLS and the exact challenge before submission.

Configure a Vercel Firewall fixed-window rule for path `/mcp`, IP counting key, 100 requests per 60 seconds, action 429. Exclude the challenge. This is a per-region guard, not a global cost ceiling. Validate 429 behavior and ensure legitimate OpenAI scans still complete. Do not add an application memory counter or Redis.

Verify HTTP initialization, tool listing and both calls from an unauthenticated external client; a function build or ZIP check does not establish a working deployment. Keep platform log retention and transport-data disclosures accurate before public promotion. The application does not log or retain supplied documents.

## Remote candidate trial and submission gates

Use route B (`new-remote`, `stark-ai-developer-tools@1.0.0`) after an attributed existing-update rejection and the documented lack of migration support. Do not repeat a completed eligibility check. Preserve private portal evidence outside Git. A local candidate ZIP, a GitHub Release, an accepted portal draft and public installation are separate milestones.

1. **Run the local contract suite and build the candidate.** Use the commands above, record the source commit and ZIP SHA-256, and check that the archive declares one remote MCP and preserves all ten bundled skills. Run the loopback server and exercise initialization, `tools/list`, both tools and the eight scenarios below. This is local proof only.
2. **Provision and qualify the service.** Follow Vercel qualification above. Record the deployed source commit and deployment ID privately. Test the final HTTPS `/mcp` endpoint from an unauthenticated external client: no Vercel login, cookies or bypass token. Expect exactly `validate_skill_metadata` and `validate_plugin_manifest`, argument/result schemas and the declared annotations. Repeat all scenarios, check the 64 KiB document / 128 KiB request / depth / finding limits and verify controlled WAF rejection separately. Leave the service available for OpenAI scans.
3. **Select the release profile after service qualification.** Set the three canonical fields described above to `new-remote`, `stark-ai-developer-tools` and `dist/openai/stark-ai-developer-tools-1.0.0.zip`; regenerate projections and run the required release checks. The canonical source now selects `new-remote`; inspect the effective identity and MCP configuration before uploading.
4. **Finish the GitHub release handoff.** Merge the feature/profile changes, wait for successful validation on `main`, then review and merge the separate Release Please release PR. That manifest change starts Publish Release, whose write job requires approval of the `release` environment. Verify Post-release Evidence and the unchanged direct `openai.zip` release asset plus `release-subject.json`. Manual dispatch does not bypass release-candidate eligibility or environment approval. See [publishing](../../docs/publishing.md#publish-release).
5. **Create the OpenAI draft.** Use a verified publisher with the necessary submission role. Upload the MCP-containing ZIP as a new plugin, select With MCP / No auth, then obtain the challenge from that draft. Deploy its exact value as `OPENAI_APPS_CHALLENGE` and complete domain verification. Confirm the ten skills and two discovered tools and resolve the latest package/skill/tool scans.
6. **Run the reviewer experience.** In a fresh session, use only this plugin's metadata MCP for the scenarios below. Record expected and observed results privately. Ensure website, support, privacy and terms URLs are public and describe the actual running service and publisher. Add five positive and three negative cases, accessible demo recording URL and release notes. Submit for review manually. Approval still requires a separate publication action and fresh-install verification before adding a public installation link.

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

## Manual release sequence

A0: permit the existing skills-only update first, with one normal check or a clearly attributed rejection. A1: migrate the existing identity only with explicit OpenAI permission; current documentation says this migration is unsupported. B: otherwise submit the new remote candidate with MCP in the initial ZIP, “With MCP” and “No auth”. C: only a confirmed partner allowlist enables local stdio submission. D: use the existing portable marketplace as a bridge.

Run `pnpm run release:manage -- openai-route` for the initial eligibility check, or add `--evidence-file` with an explicitly selected private JSON file. The command is read-only and prints only the selected route, status and reason. Fields include `skillsOnlyUpdate`, `existingMigration`, `newRemote` and `desktopPartner` (`confirmed` or `unavailable`); an active route also records `activeRoute`, `activeStatus` and a route-specific unavailability classification. Do not publish that evidence file. The pure selector in `scripts/lib/openai-release-handoff.mjs` consumes this private maintainer evidence. Pending review, package failures, missing permissions, DNS incidents and review findings do not justify identity hopping. Keep private portal observations out of issues and public build inputs. A support reply arriving later does not cancel an active review. Submission, publication and issue closure remain manual under ADR-0059.

Provide five positive cases (minimal skill; optional fields; portable manifest; OpenAI manifest; corrected metadata) and three negative cases (required fields/name mismatch; malformed JSON/schema; unsupported file/URL/shell action), a demo, release notes, current legal URLs and scans. Public publication is complete only after fresh installation shows the expected skills and both tools.

Rollback: stop promotion, restore the last qualified Vercel deployment under the same host, and use a new plugin patch for restored reviewed content. Preserve previous identities.

Primary contracts: [Agent Skills](https://agentskills.io/specification), [Agent Plugins](https://agent-plugins.org/specification), [OpenAI submission](https://developers.openai.com/plugins/deploy/submission), [Desktop partners](https://developers.openai.com/plugins/deploy/desktop-only), [MCP handler](https://github.com/vercel-labs/mcp-handler).
