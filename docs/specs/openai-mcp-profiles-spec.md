---
title: OpenAI MCP profiles and metadata validation
slug: openai-mcp-profiles
artifact_path: docs/specs/openai-mcp-profiles-spec.md
mode: standard
status: approved
owner: stark-ai-de
repo: agent-skills
created: 2026-10-16
updated: 2026-10-16
---

# OpenAI MCP profiles and metadata validation

## Goal and scope

Provide useful deterministic metadata checks through one stateless core and HTTP/stdio adapters, with explicit OpenAI distribution identities and reproducible artifacts. This specification records the feature introduced by PR #151 and the approved Unicode and stdio-limit corrections. It does not authorize deployment, release, portal submission or publication.

## Architecture and profiles

[ADR-0071](../adrs/0071-add-target-specific-openai-distribution-profiles.long.md) owns target-specific profiles; [ADR-0072](../adrs/0072-share-one-metadata-validation-core-across-mcp-transports.long.md) owns the shared core. No new ADR is required: these corrections implement existing contracts. Canonical skill contents and the independently pinned portable/Claude SSH runtime remain unchanged.

The canonical plugin source selects exactly one release profile. `existing-skills-only` retains the canonical identity without MCP; `existing-remote` uses the existing identity with HTTP MCP; `new-remote` uses `stark-ai-developer-tools`, initially 1.0.0, with HTTP MCP; `desktop-local` uses `stark-ai-developer-desktop`, initially 1.0.0, with a bundled offline stdio server. The current selected profile is `new-remote`. Portable bundle versions remain independent of OpenAI profile versions.

## Tool and resource contracts

- `validate_skill_metadata({frontmatter, directory_name})` accepts one YAML metadata mapping and one directory name. Required fields, optional metadata types and directory agreement follow the pinned skill rules. Unknown fields do not become repository policy.
- Skill and directory names use NFKC normalization, Unicode letters/numbers, lowercase, single separating hyphens and at most 64 Unicode codepoints. Compare normalized names. Whitespace, paths and repeated/leading/trailing hyphens remain invalid. MCP argument validation must not reject valid supplementary-plane names based on UTF-16 length.
- `validate_plugin_manifest({manifest_json, format})` accepts JSON and either `agent-plugins-1.0.0` or `openai-native`. Portable checks use the pinned official schema; OpenAI checks cover the dated metadata subset, including complete SemVer syntax.
- Both tools return `valid`, `ruleset`, deterministic `issues` (`code`, `path`, `message`) and `truncated`. MCP argument failures remain distinct from document validation findings.
- Documents are limited to 65,536 UTF-8 bytes, document nesting to 20 and returned issues to 100. YAML aliases, custom tags and multiple documents are rejected.
- HTTP request bodies are limited to 131,072 bytes. Each stdio JSON line is limited to 131,072 bytes excluding its final LF; the input buffer must never grow beyond that per-message bound. Oversized complete or incomplete lines close the transport with a generic diagnostic, without invoking a tool or including supplied contents. Fragmented UTF-8 input and multiple individually valid messages in one stream chunk remain supported.

The service does not inspect files/ZIPs, fetch URLs, execute commands, certify security or determine publication eligibility. It stores no payloads and does not log supplied documents. Hosting operational data has separate disclosures; use synthetic inputs for qualification.

## Packaging and qualification

Remote archives contain the selected MCP URL and unchanged canonical skills. Desktop archives contain a self-contained Node bundle and dependency notices, with no startup installation. Build manifests bind source, schema, lockfile and bundle hashes. Each isolated desktop release build generates its own bundle. Evidence preserves the canonical bundle identity and separately names the OpenAI projection identity; historical version comparison uses the latest release of the same plugin identity, and completion validates profile identity/version with legacy compatibility.

HTTP exposes `/mcp` and `/health`. On Vercel the domain challenge is an exact static build output, with stale output removed when unconfigured; rotation requires a new build. No challenge values belong in Git or logs.

## Source challenge and verification

The official [Agent Skills specification](https://agentskills.io/specification) and [reference validator](https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/validator.py) support Unicode names. The old ASCII regex and MCP UTF-16 length bound rejected valid names. An actual stdio request of 140,208 bytes was accepted despite the documented request limit; framing must enforce that limit before SDK parsing. Keep the existing pinned SDK and use Node stream primitives instead of adding a dependency.

The maintainer approved this public destination and the implementation plan on 2026-10-16. Local checks, hosted qualification and portal acceptance are separate evidence. PR #151 records earlier hosted qualification; it does not prove a later corrected deployment. Portal challenge, scans, client/model trial, demo, review and publication remain separately qualified operations. This correction PR makes no claim of a new hosted deployment.

## Acceptance and validation

Test accented/non-Latin/supplementary names, NFKC equivalence, the 64-codepoint boundary and invalid uppercase/path/whitespace/hyphen cases. Exercise both tools through real transports. For stdio test normal initialization/calls, exactly-limit and oversized frames, the 140,208-byte regression, incomplete overlong input, fragmentation and coalesced messages. Oversize failures must not leak payloads or produce tool results.

Run `pnpm run validate:metadata-mcp`, targeted formatting and script lint; rebuild stdio and exercise isolated desktop startup and the existing two-build reproducibility test. Review documentation links and public content. Record actual results in the PR, not as unrun passes here.

## Rollout and done criteria

Save this specification before code changes, implement both corrections with regressions, verify the affected contracts, and open a follow-up PR from freshly fetched main. Completion requires passing local checks and a PR with exact source/test evidence. No migration or dependency change is needed. Roll back through a reviewed revert if required; do not repack immutable releases or deploy as part of this task.
