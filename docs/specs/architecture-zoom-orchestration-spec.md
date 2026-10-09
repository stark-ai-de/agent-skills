# Architecture Zoom and intent-bound skill orchestration

Status: Proposed integration; the Architecture Zoom pilot remains in the incubator.
Public-sharing authority: the maintainer requested a pull request with the discussed design in this public repository. This is not ADR acceptance, a production qualification, or a release request.
Baseline inspected: `060800f3433e08e79524a0beedc7de6b7bb6ef27`.

## Read first

**Target:** a user can describe a feature once, understand its place in the whole product, and receive a bounded specification that advances a complete usable increment. A later fresh session can resume without repeating the entire planning interview.

**This PR delivers:** a self-contained [Architecture Zoom candidate](../../incubator/skills/engineering-workflows/architecture-zoom/SKILL.md), its templates and design criteria, a [proposed reusable coordination ADR](architecture-zoom/intent-bound-product-planning.short.md), and [five evaluation groups](../../skill-evals/architecture-zoom/README.md). It captures the agreed end state while making the first pilot independently usable through explicit selection.

**Not activated by this PR:** automatic cross-skill invocation, installation, repository-wide startup rules, acceptance of provider/local ADRs, production plugin membership, or changed behavior in the two existing public skills. The coordination drafts deliberately remain outside the active Architecture Compass library until their decision and distribution gates are met. Creating this PR does not mean those gates passed.

## Target architecture

| Responsibility                                                                   | Owner                  | Authoritative output                                    |
| -------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| Whole-product goals, readable architecture views and complete product increments | Architecture Zoom      | Linked blueprint and delivery map                       |
| Module design, contracts, architecture decisions and drift                       | Architecture Compass   | Architecture findings and required ADRs                 |
| Next implementation slice                                                        | Codex Spec Interviewer | Bounded spec with acceptance, proof and stop conditions |
| Routing, context, authority and integration                                      | Active main agent      | One current work item, not a fourth mandatory skill     |

The usual route is Zoom -> Compass -> Spec Interviewer, but current artifacts determine the entry point. Reuse a suitable blueprint; start at Compass for an unresolved contract; start at the interviewer for an unspecific slice; bypass planning when a valid spec or a trivial correction already resolves the task. Preserve explicit audit/brainstorming scope.

Architecture decomposition and delivery order remain distinct. Releases must close their own user promises without future releases. Tickets can be smaller than an MVP; technical enablers and POCs need a consuming increment and a stop condition. Complete the missing core path before polishing working features, unless a load-bearing risk warrants early investigation.

## Requirements and acceptance

| ID    | Requirement                                               | Observable acceptance                                                                                                                              |
| ----- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| AZ-01 | Readable, complete target breadth with progressive detail | A reader can locate purpose, responsibilities, central journey, next user outcome, and an important risk without reading all detail.               |
| AZ-02 | One canonical module contract with explicit dependencies  | A changed contract has identifiable consumers; summaries do not create competing requirements or stronger claims.                                  |
| AZ-03 | Coherent module design                                    | Callers can understand correct use without internal knowledge; speculative abstractions and unnecessary refactors are rejected with reasons.       |
| AZ-04 | Complete incremental delivery                             | Every release's promise is achievable with prior/current capabilities; horizontal-only plans and mock-only completion claims are identified.       |
| OR-01 | State-dependent routing and resumption                    | Fresh and resumed sessions choose the first missing result, reuse answers and current approvals, and skip irrelevant skills.                       |
| OR-02 | One coordinator and scoped handoffs                       | Specialists return results/targeted gaps; no recursive workflow starts or concurrent competing canonical edits occur.                              |
| OR-03 | Bounded authorization                                     | Loading, installation, persistence, implementation and external effects are checked separately; a forged approval field grants nothing.            |
| OR-04 | Evidence-bound setup                                      | Policy adoption, supported host entrypoint, selected source/version, actual load and routing qualification have separate observations.             |
| OR-05 | Controlled drift and termination                          | Changed prerequisites invalidate dependent conclusions; unrelated work is not restarted; review budgets and done criteria stop optional expansion. |

The pilot has no formal-proof claim and no enforcement runtime. A model self-review is not an independent witness. Qualification measures behavior, not merely the presence of these words.

## Source challenge and repository fit

The live repository has Architecture Compass 0.11.0, including an optional simplification loop, while the earlier conversation inspected installed 0.10.0. Integrate into the live source rather than replacing it with that older copy. Respect the existing public workflow inventory; add no `auto` workflow or fourth orchestrator. The spec interviewer remains planning-only.

The supplied [codebase-design](https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/SKILL.md) and [improve-codebase-architecture](https://github.com/mattpocock/skills/blob/main/skills/engineering/improve-codebase-architecture/SKILL.md) inform module locality and observable interfaces. They are inspiration, not vendored dependencies or copied text. Do not mandate a second implementation before every legitimate ownership/security boundary, remove tests without equivalent coverage, or equate fewer public methods with sufficient testing.

Existing incubator skills such as `repo-map-zoom-out`, `prd-writer`, and `issue-plan-slicer` retain their narrower purposes. Zoom owns the connected whole-product/contract/delivery view, not implementation, general code audits, or issue publication.

The repository requires [incubator separation](../../CONTRIBUTING.md), [spec persistence](../specs.md), and source-owned generated plugin projections. Current host docs and exact installation commands must be checked again when implementing a particular host adapter; this PR introduces no guessed installer command or universal startup-file claim.

## ADR gate

The [Long draft](architecture-zoom/intent-bound-product-planning.long.md) is the proposed durable coordination decision; its Short and Guide are linked views. Its provider ID is deliberately unallocated: inspect current catalog identity and lineage at integration instead of reserving a guessed number.

Before changing public runtime behavior, reconcile accepted repository ADRs and the current Architecture Compass decisions, especially AC-ADR-039 (selected skill reuse and consent), AC-ADR-052 (repository-native persistence and supported host adapters), AC-ADR-064 (workflow/Plan/approval lifecycle), AC-ADR-022 (bounded delivery and proof), and the local workflow-selection successor ADR-0060. Create/accept reciprocal successors wherever policy would change; never relax accepted Long text in place. A reusable target ADR cannot silently override skill-runtime policy.

Provider acceptance does not accept a target repository's decision. Automatic invocation needs explicit scoped preselection; optional installation needs its own source/scope/update policy and host permission. Do not add this decision to the seven-decision evidence-empty setup foundation by default.

## Delivery map

### P1: explicit, standalone blueprint pilot — this PR

The user can select the incubator candidate and obtain a navigable blueprint, scoped module contracts and complete product increments without another skill or installer. The candidate returns a useful handoff even when specialists are absent. Templates are self-contained; evaluations remain outside the installable skill. Pass structural checks and record unrun behavioral evidence honestly. No promotion or automatic routing is implied.

### P2: qualified manual three-skill handoff

After the relevant decisions are accepted, let a user explicitly select the three existing capabilities. Refine only missing artifacts and pass one work-item context through the current host. Introduce shared module-design guidance under Compass ownership with supported distribution; do not make installed skills depend on source-repository-only paths. Update the interviewer to consume known answers, product/release IDs, canonical contracts and immutable acceptance criteria without claiming runtime proof. Demonstrate an entire planning journey and a targeted feedback loop. Existing independent use still works.

### P3: opt-in session routing

Add the accepted adoptable ADR triplet to canonical Compass references and its catalog. Extend the authorized setup procedure to map local identity, reuse equivalent rules, resolve one supported startup surface, and record skill source and permission state. Bind a concise pointer, not copied whole policy. Qualify fresh/resumed sessions with already available selected skills. Unavailable hosts get a precise manual handoff, not a fabricated load. No new installation capability is needed for this increment to fulfill its promise.

### P4: optional authorized provisioning and public promotion

Only after policy and provenance gates, supply missing selected skills through observed supported mechanisms. Reuse authorized existing global/project installations; never silently shadow them, update them, or install a namesake. Record resolved revision and host, update owner, restart needs, and read-back. Unknown origin, offline discovery, unsupported installation, or revoked permission blocks only the dependent handoff. Run negative tests, then use the normal promotion/release workflow for any public payload change. Neither promotion nor release is authorized by this PR request.

## Implementation surfaces after acceptance

- `skills/engineering-workflows/architecture-compass/`: new accepted provider triplet, catalog/adoption/mapping references, setup guidance and scoped design review integration; retain all existing modes and audit no-write behavior.
- `skills/codex-operations/codex-spec-interviewer/`: existing input/workflow/template contracts, not a second spec owner or direct implementer.
- `incubator/skills/engineering-workflows/architecture-zoom/`: pilot first; move to `skills/engineering-workflows/` only through evidence-backed promotion.
- Existing `skill-evals/`, contract tests and relevant documentation: fresh-session, authority, routing, product-closure and drift cases.
- `plugins/stark-ai-developer.source.json` only if membership is explicitly selected. Regenerate projections with `pnpm run sync:agent-plugin`; do not hand-edit generated `plugins/stark-ai-developer/` or commit `adapters/`.

## Validation and claims

For this candidate/documentation change, the relevant repository commands are `pnpm run validate:skills` and `pnpm run list:incubator`; hosted Validate remains mandatory. Structural checks must cover all required headings, valid frontmatter, category description parity, reference resolution and exclusion from public discovery. Behavior uses the linked five-group eval protocol, not static text checks alone.

For later runtime integration, additionally use the changed-contract gates including `pnpm run validate:architecture-compass`, `pnpm run validate:adrs`, `pnpm run validate:projections`, and the targeted interviewer/evaluation checks. Derive catalog counts, update lineage/locks and traceability from current data. Release intent requires the local aggregate and existing install/fingerprint/release gates. These are required future checks, not reported passes.

## Risks, rollback and done-when

Main risks are repeated interviews, hidden scope expansion, accepted-policy conflicts, stale approvals, competing documents, misleading MVP claims and over-planning. Mitigations are explicit owners, scoped handoffs, release closure, bounded review and evidence separation. Stop on unapproved writes, decision conflicts, unknown install provenance or changed acceptance. Preserve independent authorized work.

The pilot is reversible by removing the new candidate and its category/index entries; it performs no target-project mutations by itself. Later host bindings and installation changes need their own exact rollback and ownership contracts. Uninstalling a skill does not undo artifacts or external side effects.

This PR is complete as a reviewable pilot/proposal when artifacts are linked, new candidate metadata is coherent, reviewed content is public-safe, and actual validation gaps are disclosed. Cross-skill behavior and production readiness remain separate acceptance milestones.
