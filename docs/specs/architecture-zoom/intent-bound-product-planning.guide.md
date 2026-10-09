# ADR draft guide: Coordinate product planning through intent-bound skill contracts

ID: Unallocated provider draft
Title: Coordinate product planning through intent-bound skill contracts
Status: Proposed
Date: 2026-10-09
Owner: stark-ai-de maintainers
Scope: target-repository
Category: engineering-workflow
Tags: product-planning, skill-routing, vertical-slices, autonomy, evidence
Applies when: A repository opts into coordinated incremental product or feature planning.
Adoptable: true
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: Not qualified by host behavior tests
Gist: The main agent selects the next missing planning capability, reuses current artifacts, and stops at an authorized, verifiable product-planning outcome.
Variant: Guide

Variants: [Short](intent-bound-product-planning.short.md) · [Long](intent-bound-product-planning.long.md) · **Guide**

> Non-normative implementation guidance. None of the automatic setup or provisioning behavior below is enabled by this PR. Follow the [integration spec](../architecture-zoom-orchestration-spec.md) and the actual accepted runtime rules.

## Integration sequence

First qualify the standalone incubator skill. Next qualify explicit three-skill handoffs using existing selected skills. Only then integrate the accepted adoptable ADR, a supported startup binding and opt-in routing. Treat optional missing-skill installation as a separate increment. Do not guess a free AC-ADR number or patch accepted decision text in place.

Architecture Compass 0.11.0 already contains an optional simplification loop. Extend its owning guidance instead of replacing that loop or adding a fourth review workflow. Keep one shared module-design contract after promotion; each installed skill must have supported access without links that work only inside this source repository.

At integration, reconcile catalog counts, adoption matrices, decision locks/lineage, spec-interviewer contracts, eval inventory, and generated projections using the current repository tooling. Keep evaluation fixtures out of the runtime payload. Regenerate, do not hand-edit portable plugin copies.

## Setup checklist

Present one concrete proposal containing the local ADR identity/status/mapping, exact supported startup file, work index, three selected capabilities and their observed availability. Separate skill preselection, loading permission, optional installation, and actual document/configuration writes. Keep repository/global scope explicit. The first setup approval is not permission for future source changes, updates, credentials, or arbitrary code execution.

Record before/after state and read-back. If a host ignores the selected file, has an override, requires a restart, or offers no skill installer, report that exact condition. Preserve the existing valid configuration and use a permitted manual handoff rather than inventing a new host adapter.

## Example startup pointer

This is a template for an observed supported instruction surface, not a universal filename or ready-to-run installer:

> For product, feature or architecture planning, read <local coordination ADR> and <existing product/work index>. Reuse current goals, contracts, specs and genuine approvals. Select the first missing capability: Architecture Zoom, Architecture Compass or Codex Spec Interviewer. Preserve the request's scope and Plan/write boundaries. Provision missing selected skills only under the explicit source/scope policy. Return targeted gaps to the coordinator and stop at the agreed completion criteria.

Resolve placeholders from inspected repository state. A fresh session must demonstrate actual loading/routing before claiming the binding works.

## Work-item contract

Use the candidate's [work-item template](../../../incubator/skills/engineering-workflows/architecture-zoom/assets/work-item-template.md) as a design example. It is not a native host schema. Reference canonical content and evidence rather than copying every document into the handoff. Record material uncommitted state as well as a commit when it affects validity.

Example: a user requests skill updates. A current product map is reused. Compass examines the update contract and identifies the missing partial-failure rule. The interviewer specifies a one-environment update journey only after the necessary behavior is clear. New providers, background synchronization and a universal extension framework remain non-goals. A planning-only request ends after the authorized spec delivery, not after unrequested implementation.

## Bounded review

Pilot default: one focused correction round and one targeted recheck, then surface an unresolved material decision. This is a configurable work budget, not an assurance score. Additional reviewers can reveal problems but do not prove independence. Only required unmet criteria block completion; optional improvement proposals stay out of the active increment.

## Evidence and evaluation

Use the [five-group evaluation protocol](../../../skill-evals/architecture-zoom/README.md). Keep these observations separate:

| Claim | Needed evidence |
| --- | --- |
| Local policy adopted | Local identity, actual acceptance decision and mapping |
| Startup binding configured | Authorized edit and read-back in the supported scope |
| Skill available | Exact resolved source/revision and host inventory |
| Skill loaded | Correct instructions observed in the specific session |
| Routing qualified | Positive and negative cases run on the named host |
| Hard boundary enforced | Observed host/sandbox/CI controls, not prompt wording |

Do not count written fixtures as executed evaluations. Preserve failures and unknowns, record the input revisions, and bind observations to the actual tested candidate. An unavailable specialist is a pending transition, not a successful three-skill run.
