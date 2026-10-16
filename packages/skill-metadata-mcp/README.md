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

The explicit profile creates `dist/openai/stark-ai-developer-tools-1.0.0.zip`. It does not alter the selected release profile. The canonical source retains the existing skills-only release until the maintainer selects a permitted portal route. To select a profile for a release, update `openai.activeProfile`, `distributions.openaiPlugin` and `outputs.openaiArchive` together in the canonical plugin source; run sync and all release checks. Do not repack published tags.

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

Use a new project `stark-ai-developer-mcp` in the existing `servrox-solutions` team. Root directory: `packages/skill-metadata-mcp`; framework: Other; Node.js: 24.x. The committed configuration builds a self-contained Node HTTP bundle. Include files outside the project root in the build context so the build can consume the canonical pinned schema. No new package manager or global toolchain is required.

Previews remain protected. For production configure the controlled host `skills-mcp.stark-ai.de`; expose `/mcp`, `/health` and `/.well-known/openai-apps-challenge` without a Vercel login. Set the exact portal challenge text as `OPENAI_APPS_CHALLENGE` in the appropriate deployment environment; never commit it. A missing challenge returns 404. Verify DNS ownership, TLS and the exact challenge before submission.

Configure a Vercel Firewall fixed-window rule for path `/mcp`, IP counting key, 100 requests per 60 seconds, action 429. Exclude the challenge. This is a per-region guard, not a global cost ceiling. Validate 429 behavior and ensure legitimate OpenAI scans still complete. Do not add an application memory counter or Redis.

Verify HTTP initialization, tool listing and both calls from an unauthenticated external client; a function build or ZIP check does not establish a working deployment. Keep platform log retention and transport-data disclosures accurate before public promotion. The application does not log or retain supplied documents.

## Manual release sequence

A0: permit the existing skills-only update first, with one normal check or a clearly attributed rejection. A1: migrate the existing identity only with explicit OpenAI permission; current documentation says this migration is unsupported. B: otherwise submit the new remote candidate with MCP in the initial ZIP, “With MCP” and “No auth”. C: only a confirmed partner allowlist enables local stdio submission. D: use the existing portable marketplace as a bridge.

Run `pnpm run release:manage -- openai-route` for the initial eligibility check, or add `--evidence-file` with an explicitly selected private JSON file. The command is read-only and prints only the selected route, status and reason. Fields include `skillsOnlyUpdate`, `existingMigration`, `newRemote` and `desktopPartner` (`confirmed` or `unavailable`); an active route also records `activeRoute`, `activeStatus` and a route-specific unavailability classification. Do not publish that evidence file. The pure selector in `scripts/lib/openai-release-handoff.mjs` consumes this private maintainer evidence. Pending review, package failures, missing permissions, DNS incidents and review findings do not justify identity hopping. Keep private portal observations out of issues and public build inputs. A support reply arriving later does not cancel an active review. Submission, publication and issue closure remain manual under ADR-0059.

Provide five positive cases (minimal skill; optional fields; portable manifest; OpenAI manifest; corrected metadata) and three negative cases (required fields/name mismatch; malformed JSON/schema; unsupported file/URL/shell action), a demo, release notes, current legal URLs and scans. Public publication is complete only after fresh installation shows the expected skills and both tools.

Rollback: stop promotion, restore the last qualified Vercel deployment under the same host, and use a new plugin patch for restored reviewed content. Preserve previous identities.

Primary contracts: [Agent Skills](https://agentskills.io/specification), [Agent Plugins](https://agent-plugins.org/specification), [OpenAI submission](https://developers.openai.com/plugins/deploy/submission), [Desktop partners](https://developers.openai.com/plugins/deploy/desktop-only), [MCP handler](https://github.com/vercel-labs/mcp-handler).
