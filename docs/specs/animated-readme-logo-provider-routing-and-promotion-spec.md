---
title: "Animated README Logo Provider Routing and Promotion"
slug: "animated-readme-logo-provider-routing-and-promotion"
artifact_path: "docs/specs/animated-readme-logo-provider-routing-and-promotion-spec.md"
mode: "full"
status: "accepted"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-12"
updated: "2026-07-12"
source_request: "Optimize and promote animated-readme-logo with optional Recraft V4.1 generation, a portable fallback, strict validation, and release-ready evaluation proof."
---

# Animated README Logo Provider Routing and Promotion

## Goal

Promote `animated-readme-logo` as a portable public workflow that can create or transform a validated SVG logo, define deterministic motion, safely audit README references, and export only verifiable raster artifacts. Eligible new-mark creation may use Recraft V4.1 only after live capability and cost discovery plus explicit approval.

## Scope

### In scope

- Four explicit task modes: `review`, `create`, `transform`, and `animate-export`.
- One host-neutral skill with capability-detected provider routing.
- Optional live Higgsfield/Recraft preflight for eligible new or intentionally redesigned marks.
- Direct local SVG authoring and optional `drawio-diagrams` assistance for geometric, editable marks.
- Strict dependency-free SVG validation, deterministic motion specifications, capability-gated raster export, and animated-image inspection.
- Root-bounded README asset audits.
- Reusable visual-assertion infrastructure extracted without changing the existing six-prefix grammar.
- Self-contained eval proof, public promotion, skill version `0.2.0`, and catalog release `0.9.0`.

### Out of scope

- Agent-specific Codex, Cursor, or Claude copies or decision commands.
- Provider generation for review, a clean existing SVG, faithful transformation, or reference-media-dependent work.
- Hardcoded provider availability, price, credentials, or account configuration.
- Installing optional animation/export tools automatically.
- Adding GIF, APNG, or WebP visual-assertion prefixes in v0.9.0.
- Guaranteeing GitHub renderer behavior without a manual preview.

## Functional requirements

### Routing and status

- WHEN the skill activates, IT SHALL select one current task mode from `review`, `create`, `transform`, or `animate-export`.
- WHEN reporting any activated task, IT SHALL always expose `Task mode`, `Source route`, `Provider state`, `Approval state`, `SVG readiness`, and `Export status`.
- WHEN work spans multiple modes, IT SHALL finish and report one mode before advancing to the next.
- WHEN the task is review, clean-SVG reuse, faithful transformation, or reference-media-dependent work, IT SHALL mark Recraft not eligible and SHALL NOT perform a paid call.

### Live Recraft preflight

- WHEN a new or intentionally redesigned mark has no reference-media requirement, THE SKILL SHALL first detect a callable live Higgsfield MCP capability, the exact model identifier `recraft_v4_1`, and the exact current batch cost.
- THE SKILL SHALL NOT infer live availability or cost from documentation, memory, examples, or a prior run.
- WHEN live facts are incomplete, THE SKILL SHALL report unavailable or indeterminate provider state and SHALL use direct local SVG authoring.
- BEFORE a credit-consuming batch, THE SKILL SHALL present a sanitized brief, exact live cost, and settings for one 1:1 1k output with no background.
- THE SKILL SHALL use `utility_vector` by default and `vector` only for an explicitly expressive mark, with the reason stated.
- THE SKILL SHALL require explicit approval of that exact post-preflight batch and SHALL stop while approval is pending.
- WHEN approval is declined, THE SKILL SHALL record the refusal once and SHALL take the direct local SVG route without making a paid call.
- WHEN a preflight becomes stale or its cost/settings change, THE SKILL SHALL present a new preflight and obtain new approval.
- THE SKILL SHALL sanitize provider input to exclude secrets, private paths, internal hosts, hidden metadata, customer data, and unrelated repository content.

### Portable source and motion

- EVERY completed create, transform, or animate-export workflow SHALL include a self-contained SVG that passes the strict validator and a deterministic motion specification.
- A provider result SHALL remain concept input until a local SVG exists and passes strict validation.
- THE SKILL SHALL author SVG directly by default and SHALL use `drawio-diagrams` only when geometric, editable construction materially helps.
- THE SVG SHALL avoid scripts, `foreignObject`, external or unresolved references, embedded rasters, remote fonts, foreign namespaces, comments, unintended backgrounds, and hidden/private metadata.
- THE CANONICAL SVG SHALL represent the static first frame, use explicit presentation attributes instead of stylesheet blocks, and SHALL keep declarative motion in the separate deterministic specification or derived delivery artifacts.
- THE MOTION SPECIFICATION SHALL name SVG layers, explicit keyframes and values, easing, duration, loop point, static first frame, reduced-motion state, transparency, and intended exports.
- A review MAY report a non-ready SVG only when it explicitly reports incomplete pipeline status and concrete remediation.

### Export and README delivery

- RASTER EXPORT SHALL be capability-gated. Missing exporters or inspectors SHALL produce `Export status: capability-unavailable`, not fabricated files or success.
- EVERY claimed animated GIF, APNG, or WebP SHALL exist and pass the focused structural and hidden-metadata inspector.
- README animation SHALL include a meaningful static fallback, reduced-motion delivery, alt text, dimensions, and a manual GitHub preview requirement.
- Lottie, dotLottie, live SVG animation, CSS, and JavaScript SHALL be treated as optional web/demo formats rather than the only README delivery.

### Audit path safety

- THE README AUDIT SHALL require an explicit root and treat the README path plus local image references as untrusted.
- THE AUDIT SHALL reject POSIX absolute paths, Windows drive-absolute paths, UNC/network paths, traversal above the root, and symlink-resolved paths outside the root before reading the target.
- THE AUDIT SHALL read only root-bounded regular files, SHALL NOT fetch remote assets, and SHALL NOT mutate repository or index state.

### Portability

- THE SKILL SHALL NOT branch on agent identity or emit Codex-, Cursor-, or Claude-specific commands.
- HOST-SPECIFIC tailoring SHALL be reconsidered only if a future host requires a materially different tool or output contract.

## Acceptance criteria

- The public skill metadata reports version `0.2.0` and the folder is promoted to `skills/engineering-workflows/animated-readme-logo/`.
- Every positive eval reports all six public status fields with contract-valid values.
- Review, clean-SVG, and faithful-transform cases prove no provider call is attempted.
- An eligible creation case proves live discovery, a sanitized exact-cost preflight, and no paid call while approval is pending.
- Declined, unavailable, and indeterminate provider cases reach the direct local SVG fallback.
- An approved live Recraft proof uses `recraft_v4_1` with the approved one-output settings and records current cost without publishing it as a constant.
- A forced-local proof produces an SVG that passes the strict validator plus a complete deterministic motion spec.
- Root-boundary fixtures reject absolute, UNC, traversal, and symlink escapes.
- Raster fixtures are checked by the focused inspector; the v0.9 eval schema adds no GIF/APNG/WebP visual-assertion prefixes.
- Agent Skills, focused logo, visual-assertion, formatting, lint, release, and install checks pass.

## Architecture

- ADR required: yes.
- Existing ADRs consulted: ADR-0007, ADR-0008, ADR-0014, ADR-0021, ADR-0022, ADR-0024.
- ADR path: [ADR-0025](../adrs/0025-keep-animated-readme-logo-portable-with-provider-routing.short.md) ([Long, canonical](../adrs/0025-keep-animated-readme-logo-portable-with-provider-routing.long.md) · [Guide](../adrs/0025-keep-animated-readme-logo-portable-with-provider-routing.guide.md)).
- ADR gate result: required and accepted.
- Supersedes: none.

## Source challenge

- Repository evidence checked: incubator skill instructions, references, helper scripts, current evals, public category policy, validation scripts, release checks, and promotion conventions.
- Durable policy checked: ADRs for eval proof, promotion, helper portability, dependency-free Python exceptions, workflow-category placement, and host-neutral routing.
- Runtime facts deliberately excluded from static policy: current Recraft availability and cost must come from the callable live Higgsfield capability at use time.
- Requirements revised: Recraft is not a universal first step; eligibility is limited to new/redesigned marks without reference-media needs. Agent-specific skill copies were rejected because output and safety contracts do not diverge.
- Requirements preserved: Recraft-first consideration for eligible creation, exact post-cost approval, local fallback, strict SVG validation, optional draw.io leverage, honest export reporting, and release publication.

## User verification

- Final checkpoint confirmed by: repository maintainer.
- Confirmation date: 2026-07-12.
- Verified scope and non-goals: yes.
- Verified release target: catalog v0.9.0 and skill v0.2.0.
- Explicit external-cost gate: live Recraft generation still requires approval of its displayed current-cost batch.

## File plan

### Skill payload

- Promote `incubator/skills/engineering-workflows/animated-readme-logo/` to `skills/engineering-workflows/animated-readme-logo/` after proof passes.
- Rewrite `SKILL.md` and focused references for provider routing, status output, local SVG authoring, motion, export, README compatibility, and path safety.
- Add a dependency-free Python SVG validator, a Node animated-image inspector, and focused fixture tests.
- Harden README audit resolution around a declared root.

### Shared validation and proof

- Extract reusable Node visual-assertion parsing/matching from the draw.io validator while preserving its six existing assertion prefixes.
- Keep thin skill-specific wrappers and regression coverage.
- Expand `skill-evals/animated-readme-logo/` with self-contained routing, approval, fallback, capability, SVG, export, portability, and path-safety cases.

### Release-facing updates

- Update catalog metadata, public docs, changelog, release notes inputs, and install verification for v0.9.0.

## Validation

```bash
npm run validate:animated-readme-logo
npm run validate:drawio
npm run validate
pnpm format:check
pnpm lint
git diff --check
npm run list
npx skills@latest add ./skills --list
npm run smoke:install
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --version 0.9.0 --base-ref origin/main
```

### Manual and live proof

- Run an eligible creation preflight against live capability discovery; record current cost only in the transient approval checkpoint.
- After explicit approval, run one Recraft batch and verify the resulting local SVG and motion spec.
- Force the provider-unavailable route and verify equivalent local completion.
- Prove no paid call occurs for review, clean-SVG, faithful-transform, pending-approval, declined, or unavailable cases.
- Preview final README markup on GitHub after commit or push.

## Rollout and rollback

- Rollout: promote through one release PR, run the guarded release dry run, publish v0.9.0 from the merged exact SHA, then verify public installation.
- Rollback trigger: paid generation bypasses preflight/approval, path audit crosses the root, strict validation accepts unsafe SVG, or exports are claimed without proof.
- Rollback: revert through a new PR and publish a patch release; never rewrite v0.9.0.

## Risks

| Risk                    | Impact                                            | Mitigation                                                 |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Provider or price drift | Stale approval or failed generation               | Live discovery and renewed approval after any change       |
| Prompt data leakage     | Repository data reaches an external provider      | Sanitized minimal brief and explicit preflight display     |
| SVG structural risk     | Unsafe or non-portable README asset               | Dependency-free strict validator and self-contained source |
| Filesystem escape       | Audit reads files outside the declared repository | Canonical root containment before every local read         |
| Export overclaim        | README references nonexistent or invalid assets   | Capability gate, existence checks, and focused inspectors  |
| Runtime-specific drift  | Duplicate skills diverge                          | One portable contract with an evidence-based split trigger |

## Done when

- [ ] ADR-0025 and this accepted spec are indexed.
- [ ] The skill implements all modes, routes, statuses, approval boundaries, validation, and fallback behavior.
- [ ] Focused and full validators pass on the exact promotion candidate.
- [ ] Approved live Recraft and forced-local proofs are recorded without hardcoding cost.
- [ ] The public skill is promoted at version 0.2.0.
- [ ] Catalog v0.9.0 is merged, published, and verified through a clean public install.
