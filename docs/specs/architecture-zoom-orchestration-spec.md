# Architecture Zoom and intent-bound skill orchestration

Status: implementation and release preparation in PR #141; native-agent qualification and Zoom promotion remain evidence gates.
Authority: the maintainer requested completion of the discussed design for an upcoming release. This authorizes the bounded PR changes, not merge, publication, global installations or target-project adoption.
Baseline: `d3b93d7bb7fff313b42703715a10d93944f653ad` (pilot), on `main` at `060800f3433e08e79524a0beedc7de6b7bb6ef27`.

## Read first

**Target:** describe a feature once, understand its place in the whole product, and obtain a bounded specification that advances a complete usable increment. A supported fresh session should resume from repository-owned state without repeating the interview.

**Implemented:** an explicitly selectable [Architecture Zoom candidate](../../incubator/skills/engineering-workflows/architecture-zoom/SKILL.md); canonical coordination and preselection/provisioning ADRs in Compass; opt-in setup/profile/startup instructions; module-design review guidance; shared, synchronized handoff templates; interviewer consumption; targeted feedback and resumption instructions; deterministic contracts and an executable evidence checker. The [evaluation protocol](../../skill-evals/architecture-zoom/README.md) separates these checks from real agent behavior.

**Not claimed:** actual installation on a native host, automatic startup observed in a fresh session, baseline improvement, a published Zoom skill, target-project adoption, merge or release. The original proposal triplets now point to their canonical successors rather than competing with them.

## Whole-product architecture

| Responsibility                                               | Owner                  | Canonical outcome                        |
| ------------------------------------------------------------ | ---------------------- | ---------------------------------------- |
| Product breadth, readable architecture, complete increments  | Architecture Zoom      | Blueprint and delivery map               |
| Module contracts, architecture decisions and targeted review | Architecture Compass   | Contracts/findings and required ADRs     |
| Next implementation slice                                    | Codex Spec Interviewer | Bounded implementation specification     |
| Selection, approvals, current state and integration          | Main agent             | One work item; no fourth mandatory skill |

The typical route is Zoom → Compass → Spec Interviewer, but existing current artifacts determine entry. Reuse a valid blueprint. Start at Compass for a material architecture gap, or the interviewer for a missing slice specification. A complete spec or trivial correction bypasses unnecessary planning. Explicit brainstorming and audit remain within their own authority. No automatic implementation follows a planning request.

Architecture views describe structure, not task order. Each release fulfills its own user promise using existing capabilities plus its own work; no future release is required. Tickets may be smaller, and bounded technical enablers/POCs need a consuming increment. Preserve integrity, security and error recovery appropriate to the current promise. Close missing core journeys before polishing working ones unless a load-bearing feasibility risk needs an early bounded experiment.

## Durable decisions and authority

Repository [ADR-0063](../adrs/0063-coordinate-product-planning-through-intent-bound-skill-contracts.short.md) ([Long, canonical](../adrs/0063-coordinate-product-planning-through-intent-bound-skill-contracts.long.md) · [Guide](../adrs/0063-coordinate-product-planning-through-intent-bound-skill-contracts.guide.md)) records the requested coordination design. [ADR-0064](../adrs/0064-reuse-explicit-skill-preselection-with-separate-provisioning-grants.short.md) ([Long, canonical](../adrs/0064-reuse-explicit-skill-preselection-with-separate-provisioning-grants.long.md) · [Guide](../adrs/0064-reuse-explicit-skill-preselection-with-separate-provisioning-grants.guide.md)) preserves distinct invocation/provisioning authority.

Compass exposes these as [AC-ADR-067](../../skills/engineering-workflows/architecture-compass/references/ac-adr-067-coordinate-product-planning-through-intent-bound-skill-contracts.short.md) (adoptable target contract) and [AC-ADR-068](../../skills/engineering-workflows/architecture-compass/references/ac-adr-068-reuse-explicit-skill-preselection-with-separate-provisioning-grants.short.md) (runtime successor to AC-ADR-039). Existing AC-ADR-039 Decision text/digests are unchanged; reciprocal supersession changes only metadata. The seven-decision evidence-empty foundation and all five Compass workflows are retained.

Target setup allocates native ADR identity, reuses equivalent existing policy, observes one supported host instruction surface, and proposes exact pointer/profile edits. Local acceptance, recorded user preselection, current host permission, installation, document writes and implementation are separate. A model-authored approval field never grants authority. Missing or unpromoted skills produce a bounded handoff, not a silent installation. No universal installer or background orchestration service is added.

## Contracts and change control

The main agent owns a `product-planning/v1` work item linking product, release, slice, canonical contracts, relevant revisions/uncommitted state, prior answers, actual approval sources, evidence limits and non-goals. Compass owns the [work-item template](../../skills/engineering-workflows/architecture-compass/assets/product-planning-work-item.md); a repository generator creates byte-identical consumer copies that work in independently installed skills.

Specialists return one bounded result or a concrete missing prerequisite. They do not recursively start another whole workflow. Changed contracts invalidate affected conclusions and dependent approvals; unrelated work is retained only after impact is understood. Use a bounded correction/recheck budget, escalate material unresolved choices, and stop at the agreed done criteria. Optional improvements cannot enlarge scope or weaken acceptance.

## Requirement coverage

| ID    | Requirement                                    | Implemented owner / proof boundary                                              |
| ----- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| AZ-01 | Readable complete target, progressive detail   | Zoom workflow, blueprint template; human usability evidence still required      |
| AZ-02 | One canonical contract and visible assumptions | Blueprint/design guidance and versioned handoff                                 |
| AZ-03 | Coherent module seams and bounded refinement   | Compass module-contract review aid and existing simplification loop             |
| AZ-04 | Complete product increments                    | Zoom closure checks and frozen delivery scenario; real output judgment required |
| OR-01 | State-aware route/resumption                   | AC-ADR-067 and setup profile; native startup evidence required                  |
| OR-02 | One coordinator and scoped feedback            | Work-item contracts in all three skills                                         |
| OR-03 | Separate action authority                      | AC-ADR-068 and negative capture/evaluator cases                                 |
| OR-04 | Observed setup/source/host state               | Profile fields and per-host evidence gate                                       |
| OR-05 | Controlled drift, bounded reviews and stop     | Handoff dependencies, frozen scenarios and evidence rejection tests             |

## Delivery and qualification map

| Increment                                  | Authored implementation                                                             | Remaining observation                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| P1: standalone blueprint                   | Candidate, metadata, templates and design guidance                                  | Actual baseline/candidate outputs and reader review                                          |
| P2: three-skill handoff                    | Compass contract/design guidance, interviewer consumption, shared template sync     | End-to-end planning and targeted-feedback captures                                           |
| P3: opted-in session routing               | Adoptable ADR, supported startup/profile procedure, exact scope and resumption      | Fresh-session routing on each claimed host                                                   |
| P4: optional provisioning and distribution | Separate grant/provenance/restart procedure, fail-closed fallback, evidence checker | Native discovery/install and negative-authority observations; then evidence-backed promotion |

Authored instructions are not a deterministic harness. Captured observations are not formal proof. Publication of Compass/interviewer instructions must not advertise Zoom as already released. It remains in the incubator until the existing promotion gate is met. See [capture and promotion procedure](../../skill-evals/architecture-zoom/CAPTURE.md).

## Validation and release ownership

Run `pnpm run validate:product-planning` for shared-template parity, independent-payload relative links, five frozen evaluation groups and evidence-checker regression tests. The tests intentionally use synthetic checker inputs and do not produce a passing agent receipt. `pnpm run qualify:product-planning -- <report.json>` checks actual submitted capture integrity, baseline/candidate coverage, explicit rubric judgments and native-host observations. No evidence supplied is a blocked prerequisite, not a pass.

`pnpm run sync:planning-templates` writes only the two derived templates. Follow with `pnpm run sync:agent-plugin` and `pnpm run generate:traceability` for generated distribution surfaces. Do not hand-edit plugin copies. Run the release-intent local aggregate, formatting/lint, archive/install/fingerprint gates and required hosted Validate; use the final exact source state for each claim. Source contracts advance Compass to 0.12.0, Codex Spec Interviewer to 0.5.0 and the existing eight-skill bundle descriptor to 1.10.0. Release Please owns the later root version/changelog.

## Public sources and scope

The supplied public `mattpocock/skills` design and architecture-improvement skills informed the discussion, but are not copied, vendored, or required dependencies. Existing Compass simplification behavior is extended, not replaced. Other incubator PRD/slicing/repo-map tools retain their narrower purposes. Current official host documentation is linked from the provider Guides; documentation inspection does not qualify a host.

No global instruction edits, production probes, credentials, publishing changes or unrelated source refactors are included. Undo only this PR's owned changes; uninstallation or pointer removal does not undo user documents or external effects. Preserve existing approvals and user edits when reverting target bindings.
