---
title: "Portless for local development endpoints"
slug: "architecture-compass-portless-local-development"
artifact_path: "docs/specs/architecture-compass-portless-local-development-spec.md"
mode: "deep"
status: "approved"
owner: "stark-ai-de"
repo: "agent-skills"
created: "2026-09-25"
updated: "2026-09-25"
phases: ["persist-spec", "integrate-adr", "validate"]
---

# Portless for local development endpoints

## Goal

Make Portless the Architecture Compass default for compatible local HTTP and
WebSocket development endpoints, with evidence-backed exceptions. Publish one
adoptable decision through the existing library and workflow routing.

## Scope and non-goals

Add AC-ADR-065, its Short/Long/Guide variants, catalog and concern routing,
decision lock and independent lineage, adoption matrix, explicit public ID
inventory, evaluation cases, installation verification and generated plugin
projection. Increase the changed skill and bundled plugin component versions.

Do not install Portless, start a proxy, modify host trust or networking, migrate
this repository's development server or any other repository, change production
or CI topology, introduce another workflow, or publish a release. Preserve
accepted decisions, existing concurrent work and the Git index.

## Approved decision and architectural constraints

The maintainer accepted a Portless default for suitable local HTTP/WebSocket
development, including single apps, monorepos and parallel worktrees. Existing
equivalent routing is a migration candidate at the next suitable authorized
change, not an automatic permanent exemption. HTTPS is the normal target;
technical exceptions need evidence and a revisit condition. Repositories
without relevant local endpoints are not applicable.

ADR required: yes. The approved portable decision is
[AC-ADR-065 Short](../../skills/engineering-workflows/architecture-compass/references/ac-adr-065-use-portless-for-local-development-endpoints.short.md)
([Long, canonical](../../skills/engineering-workflows/architecture-compass/references/ac-adr-065-use-portless-for-local-development-endpoints.long.md) ·
[Guide](../../skills/engineering-workflows/architecture-compass/references/ac-adr-065-use-portless-for-local-development-endpoints.guide.md)).
It supersedes no existing decision and has independent lineage. No separate
repository adoption of Portless is implied. The complete normative decision
lives in Long; do not maintain a second policy copy in this spec.

Preserve AC-ADR-013/014/019/023/046/048/049/054/058: tool ownership, runtime and
hosting independence, trust boundaries, process ownership, target authority,
governance before execution, scoped validation, worktree isolation and Bun-first
execution with evidence-based fallback. Existing target ADR conflicts stop
dependent implementation until an adaptation or successor is accepted.

## Requirements and acceptance criteria

- WHEN setup finds compatible local web endpoints, it selects AC-ADR-065 through
  existing routing and provider-to-local mapping. Governance adoption alone
  does not install or migrate tooling; audit remains read-only.
- WHEN development entrypoints are migrated, they use Portless by default,
  retain a documented direct launch path, and prove server port wiring and
  service/worktree identity, including simultaneous worktrees and collisions.
- WHEN HTTPS, runtime or networking compatibility is unproven, record the
  affected boundary, evidence gap, temporary fallback, owner and revisit trigger;
  do not claim adoption is qualified.
- WHEN another accepted target decision governs routing, identify that conflict
  and propose the required local decision before implementing migration.
- WHEN a repository has no local HTTP/WebSocket endpoint, record non-applicability
  without requiring a new runtime, manifest or dependency installation.
- The library contains complete 065 variants and no accidental 064 placeholder.
  Validator and installer share an explicit ID inventory, reject unexpected IDs
  and missing variants, and the target-adoption matrix includes the new row.
- Source and generated plugin copies match; existing accepted decision digests
  remain unchanged. Passing static cases is not a live agent/runtime result.

## Implementation

Use an assigned worktree from current origin/main. Recheck ID collisions before
writing; 064 belongs to separate work and is not imported. This base contains
001–063; adding 065 yields 64 public decisions, 192 variants and 45 eligible
target-repository decisions. Keep ID inventory explicit rather than deriving
identity from the count. Reconcile deliberately if the base later gains 064.

1. Persist this approved spec before implementation.
2. Add the accepted triplet, catalog row and concern route. Keep version-specific
   commands, compatibility caveats and evidence collection in Guide.
3. Update locks, lineage, matrix and the shared inventory used by library and
   installation checks. Add six evaluation scenarios and negative regressions
   for missing 065 variants and unexpected complete 064 payloads.
4. Increase Architecture Compass 0.8.0 to 0.9.0 and the bundled plugin source
   1.4.0 to 1.5.0; keep the local listing, submission worksheet and version badge
   consistent. Leave root release versions unchanged. Generate projections
   with `pnpm run sync:agent-plugin` and review the diff.
5. Run the scoped validation below and record actual outcomes separately.

## Source challenge

Repository evidence: ADR-0039, ADR-0041, spec/publication conventions, the current
catalog, validators, install manifest and AC-ADR-013/014/019/054/058. The public
library requires Accepted/Superseded records; maintainer acceptance is recorded
below. Do not weaken that constraint to publish an unresolved proposal.

Primary sources reviewed on 2026-09-25:

- [Why Portless](https://portless.sh/why): stable local endpoint motivation.
- [Configuration](https://portless.sh/configuration): port wiring, launch-command
  limitations, existing orchestration and direct bypass.
- [Commands](https://portless.sh/commands) and [HTTPS](https://portless.sh/https):
  worktree naming, local routing and host trust effects.
- [Official source](https://github.com/vercel-labs/portless/tree/main/packages/portless/src):
  protocol, naming and platform details require version-specific verification.

Preserved: Portless default, migration preference and HTTPS default. Clarified:
not every repository has a qualifying endpoint; generated names can collide;
runtime requirements do not prove Bun incompatibility; generic Linux support
does not establish NixOS trust integration. No Portless runtime or browser probe
was performed for this documentation/library change.

## User verification

On 2026-09-25 the maintainer chose the default with documented exceptions,
preferred migration of equivalent routing, selected HTTPS with exceptions,
accepted the decision content and explicitly approved public spec versioning.
The implementation continuation explicitly selected full ADR integration over
the earlier save-only handoff. No material policy questions remain open.

## Validation

Run `pnpm run validate:architecture-compass`, `pnpm run validate:skills`,
`pnpm run validate:projections`, `pnpm run validate:plugin-evals`, and
`pnpm run smoke:install`. Check formatting of changed files and whitespace.
The negative contract tests must prove missing 065 variants and unexpected 064
triplets fail. Scenario files cover suitable default, migration, no endpoint,
technical exceptions, worktree collision and accepted target ADR conflict.

## Risks, rollout and rollback

This change offers a portable rule; target repositories still need local
governance, authorized migration and representative endpoint/TLS proof. Install
smoke needs the documented skills CLI and network or an existing verified cache.
Report unavailable stages as unverified. Do not install Portless for these tests.

Integrate policy, inventory, tests and projection as one reviewed change. Before
publication the change can be reverted together. Once the decision is accepted
in published history, change its normative policy through a successor rather
than refreshing its decision digest. Target migrations retain a direct launch
path and preserve pre-migration URL configuration for rollback.

## Done when

All approved artifacts and generated copies exist, selected checks pass, and the
final report distinguishes local validation from unperformed runtime, CI and
publication stages. The companion execution prompt is: implement this spec in
the assigned worktree, honor its ADR and scope boundaries, run its validation,
and report actual evidence without staging, committing or publishing.
