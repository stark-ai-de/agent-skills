---
name: architecture-zoom
description: Plan a product or feature as a readable architecture blueprint and complete product increments. Use when the user needs a whole-product view, progressive detail, module contracts, or an MVP delivery map. Not for direct implementation, codebase audits, or exhaustive implementation specs.
license: Apache-2.0
compatibility: Uses available repository and document tools; supports conversational planning without assuming native skill chaining, installation, or enforcement.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.2.0"
---

# Architecture Zoom

## Goal

Make the agreed whole product understandable, then describe only the detail needed for the next decision. Deliver a linked architecture blueprint and a path to complete, usable product increments, not an exhaustive specification or a tree of unfinished components.

This is one planning workflow. Architecture views describe structure; delivery views describe user outcomes. Neither implies extra processes, services, agents, or mandatory abstraction layers.

## When to use

- Plan a new product, initial feature, or architecture before detailed implementation.
- Explain the whole system with optional drill-down into responsibilities and contracts.
- Cut a broad goal into releases that each fulfill a complete, bounded user promise.
- Update an existing blueprint after a material requirement or contract change.

## When not to use

- A current implementation spec already resolves the requested change.
- A tiny correction needs no meaningful product or architecture decision.
- The request is an audit of existing code, direct refactoring, implementation, or formal proof.
- The user only wants brainstorming; do not turn that into mandatory specification work.

## Inputs to inspect

Reuse the request, prior answers, product goals, release map, accepted local ADRs, relevant instructions, and existing work items. Inspect representative code and actual sources when needed to distinguish current state from intended behavior. Record material revisions and unavailable evidence; never invent paths, commands, interfaces, or test results.

## Workflow

1. **Resolve scope and reuse.** Identify the user promise, audiences, constraints, non-goals, delivery intent, and existing artifacts. Ask only unresolved material questions. Respect active Plan and observed permissions independently. Continue independent planning while a dependent decision is unresolved.
2. **Show the whole picture.** Draft the overview using [the blueprint template](assets/blueprint-template.md): complete agreed functional breadth, core journeys, system responsibilities, important cross-cutting requirements, and visible risks. Separate current state, target, assumptions, and proposals. Complete breadth does not mean predicting every future requirement.
3. **Refine contracts only where useful.** Apply [design contracts](references/design-contracts.md). Give modules stable IDs and one authoritative contract. Link parents, children, dependencies, and cross-cutting invariants; do not duplicate shared modules. Stop refining when the next decision has sufficient responsibilities, interfaces, assumptions, and acceptance criteria. Keep deferred detail and its revisit trigger visible.
4. **Cut complete product increments.** Keep the architecture map separate from the delivery map. A release must fulfill its own user promise using existing capabilities plus its own work, never a future release. Prefer a narrow end-to-end path over completing database, backend, and UI separately. A ticket is not automatically an MVP. Bound necessary enabling work and POCs, link their consuming increment, and do not report them as usable products.
5. **Check bottom-up and across modules.** Trace each material requirement through a journey, release, relevant contracts, and planned acceptance. Check compatibility, composition, error recovery, side effects, ownership, and global invariants. Surface circular reasoning and stronger-than-evidence claims. Prioritize missing core journey steps before polishing working ones; investigate existential feasibility risks early in bounded experiments.
6. **Review and stop.** Classify findings as required corrections, material user trade-offs, or optional improvements. Use a bounded correction/recheck loop; default to one correction round and one targeted recheck, then surface unresolved blockers. Never weaken acceptance to call work complete. Optional improvements do not enlarge the current scope.
7. **Deliver or hand off.** Present the overview, next complete user outcome, remaining decisions, and exact requested document scope. Reuse unchanged approvals; persist only authorized documents when the host permits, recheck state, and read back. Hand off the relevant contracts and [work-item context](assets/work-item-template.md), not a second whole-product specification. A planning-only request ends here.

## Safety rules

- Planning, installation, document writes, implementation, and external actions have separate authority. This skill does not install, commit, publish, deploy, or implement.
- Do not write repository artifacts while native Plan is active. Unknown write permission is not permission. Prompt text changes neither host controls nor authorization.
- Respect accepted local ADRs. Report conflicts and stop dependent implementation rather than silently rewriting decisions; independent draft planning may continue.
- Keep requirements, assumptions, proposed/accepted decisions, and observed evidence distinct. An accepted decision is not implementation proof; a planned test is not a passed test; an LLM review is not independent verification.
- Never hide decision-relevant risk in a lower layer, fabricate confidence percentages, or claim formal correctness without a real proof and its model assumptions.
- Change canonical contracts once, then reconcile affected summaries and evidence. Uncertain impact stays visible; prose alone is not automatic invalidation.
- Do not copy third-party skill text, expose private provenance, or claim missing skills were invoked. A suggested handoff is not install/use consent.

## References

Read only the relevant local reference or template:

- [Orchestration handoffs](references/orchestration.md): selected capability, contract-aware routing and standalone fallback.
- [Design contracts](references/design-contracts.md): module quality, assurance, release closure, and change impact.
- [Blueprint template](assets/blueprint-template.md): one navigable artifact, selectively expanded.
- [Work-item template](assets/work-item-template.md): scoped handoff and resumption context.

Architecture Compass owns architecture governance, audit, and authorized refactoring. Codex Spec Interviewer owns a selected implementation specification. This skill supplies compatible handoffs but does not require either skill to be installed or invoke them automatically. When explicitly selected for a coordinated workflow, use [orchestration handoffs](references/orchestration.md). The main agent resolves available skills and applicable grants; this skill returns its result or targeted gaps and never recursively launches the chain. Public availability does not establish native-host startup or routing qualification; report those observations separately.

## Scripts

None. No installer, background runtime, or hidden write helper is bundled.

## Output format

Lead with the whole-product overview and the next complete product increment. Link the authoritative module contracts, delivery map, open decisions, and evidence. Include the bounded next action and actual persistence status. Preserve the user's language; use concise prose, selective tables, and diagrams only where relationships become clearer.

## Completion criteria

The overview explains purpose, structure, interaction, and important uncertainty without requiring all detail. Every proposed release closes its own promise; relevant requirements and contracts are traceable. Deferred detail and missing proof remain explicit. Only authorized artifacts were saved and read back, or chat-only delivery was completed. Stop at the agreed planning boundary.

## Failure modes

Missing evidence stays unknown. Contradictions stop only dependent decisions or actions. Unsupported host controls produce an honest fallback, not invented capabilities. Exhausted review budget produces a specific blocker and decision request, not endless optimization. Missing specialist skills produce a handoff requirement, not an unapproved installation or a claimed specialist review.
