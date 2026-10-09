# AC-ADR-067: Coordinate Product Planning Through Intent-Bound Skill Contracts

ID: AC-ADR-067
Title: Coordinate Product Planning Through Intent-Bound Skill Contracts
Status: Accepted
Date: 2026-10-09
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: product-planning, skill-routing, vertical-slices, handoffs, evidence
Applies when: A repository explicitly opts into coordinated incremental product or feature planning.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-10-09
Gist: Select the next missing planning outcome while preserving product closure, canonical context and authority.

Variants: [Short](ac-adr-067-coordinate-product-planning-through-intent-bound-skill-contracts.short.md) · [Long, canonical](ac-adr-067-coordinate-product-planning-through-intent-bound-skill-contracts.long.md) · **Guide**

This Guide is non-normative. Long is canonical.

## Adoption and supported startup

Use the [setup profile](../assets/product-planning-profile.md) within existing repository conventions. Inspect the user request, local ADRs, relevant instructions and existing product/work index before proposing exact writes. Resolve one appropriate observed host adapter under AC-ADR-052; do not create every host's file. Show one concrete approval covering local decision status/mapping, the exact pointer/profile paths, selected skills and separately requested provisioning. Persist only after authorized Plan exit and read back each result.

When the required capability is still an incubator candidate, report that condition. Explicit preview selection may support a controlled manual trial, but normal automatic public provisioning and public qualification remain blocked until promotion evidence exists. Do not make a promoted skill depend on a source-repository-only relative link to another skill.

Use the profile's short startup pointer. Treat saved/read-back, loaded in a fresh session and qualified routing as different outcomes. Prefer the current native host discovery surface for skill resolution. A generic/chat host without repository startup guarantees gets the same work-item handoff in conversation; do not claim automatic future loading there.

## Routing and targeted feedback

Read only the smallest applicable blueprint/contracts and the [work-item template](../assets/product-planning-work-item.md). For missing target/delivery breadth, select Architecture Zoom. For existing breadth but a material contract/architecture gap, use the appropriate existing Compass route; audit is no-write and saves no report. For a selected slice with sufficient contracts, select Codex Spec Interviewer. Do not reclassify feature implementation as refactoring to inherit permission. Existing complete specs, narrow corrections and explicit brainstorming bypass unrelated planning stages.

For a planning-only feature request, a boundary assessment may use read-only `audit` and return findings in the response. Required durable ADR authoring belongs to authorized `setup`. Reserve the refactor routes for requested refactoring; never use them to authorize implementation of a new feature. The interviewer remains the implementation-spec owner.

The [module-contract review aid](../assets/module-contract-review.md) makes design checks concrete. If the interviewer finds missing partial-failure behavior, return that contract ID and violated acceptance criterion to the coordinator; do not reopen the whole blueprint. Reenter Zoom only when the product promise or release cut changes.

Default review budget: one correction round and one targeted recheck, then name the unresolved material decision. This is a configurable work budget, not a correctness score. On restart compare relevant artifacts, uncommitted changes, approvals and installed skill revisions; stale dependencies invalidate related conclusions, not the entire project by default.

## Source and qualification

Observed documentation references, 2026-10-09: [Agent Skills](https://agentskills.io/specification), [Codex skills](https://developers.openai.com/codex/skills), [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [Claude skills](https://code.claude.com/docs/en/skills), and [Cursor skills](https://cursor.com/docs/context/skills). These are documentation observations, not native-host execution proof. Resolve current precedence, controls and installation details for the actual host.

Qualification must preserve real baseline/candidate outputs, matching inputs, source fingerprints, host/model identities, observed selection/effects and explicit reviewer judgment. Fixture checks establish only structural/evaluator behavior. Require a fresh-session test before claiming a startup binding works. Revoke the pointer/preselection without removing user-created artifacts; installations have separately owned rollback.

## Decision lineage

- `adapts`: [ADR-0063](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0063-coordinate-product-planning-through-intent-bound-skill-contracts.long.md).
