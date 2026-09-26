---
title: "Adoptable Jev host governance for Architecture Compass"
slug: "jev-host-governance"
artifact_path: "docs/specs/jev-host-governance-spec.md"
mode: "deep"
status: "approved"
owner: "stark-ai-de"
repo: "agent-skills"
created: "2026-09-25"
updated: "2026-09-26"
source_request: "Plan and persist an adoptable Architecture Compass policy with qualified Jev advice through a Codex CLI host integration."
phases: ["persist-proposal", "accept-and-pin", "implement", "qualify"]
---

# Adoptable Jev host governance

## Goal

Provide a public Architecture Compass policy that repositories can explicitly adopt to require qualified Jev capability advice on their authorized agent hosts. Deliver a Codex CLI integration on Linux/WSL using the existing model-mediated hook feature. The host retains selection, permissions and execution; unavailable advice preserves native work and exposes the unmet policy obligation.

The initial save-only phase is complete. On 2026-09-25 the maintainer explicitly accepted ADR-0058 and authorized implementation of this specification. The accepted decision is locked without changing its Decision text. The reviewed hook dependency is pinned to commit `39c77a0e0ddc9cc6bc631b35f571eaee49a87058`; both implementation prerequisites are satisfied.

## Scope and non-goals

In scope:

- An adoptable public AC-ADR, target adoption mappings, setup evidence and strictly read-only audit reporting.
- A pure configuration-rendering command on the existing hook manager.
- Fixed policy guidance for new tasks and material task or capability changes, with the existing `general/current` advisor behavior.
- Native Codex CLI qualification on Linux/WSL, controlled transport fixtures and one bounded real TypeSafe smoke using synthetic data.
- Owning documentation, evaluators, validators and generated skill projections.

Out of scope:

- Automatic modification of real global host configuration, hook trust, credentials or declarative configuration sources.
- A second hook manager, new daemon, gateway, cache or capability-discovery service.
- Advice before the first model step, deterministic semantic trigger classification or guaranteed secret removal.
- Extending qualification claims to Codex Desktop, Claude Code, macOS or Windows. Preserve any existing support without claiming new proof.
- Root release-version changes, merge, release publication, deployment, global activation and changes to unrelated concurrent work. The maintainer separately authorized the hook-dependency snapshot commit and, on 2026-09-26, scoped staging, commits, branch push and a draft pull request for this implementation. A disposable validation index was authorized for the earlier projection checks.
- A general speed, quality or token-saving claim.

## Repository context and dependency gate

Canonical runtime sources belong to `skills/skill-maintenance/jev-capability-advisor/`; public Compass sources belong to `skills/engineering-workflows/architecture-compass/`. Generated plugin copies are not editing surfaces. The existing Jev advisor already owns provider requests, profile semantics, request limits, capability-ID validation and native fallback.

The separately developed hook feature provides the reuse boundary: `scripts/jev_hooks.py`, its pure `build_registration()` builder, fixed guidance and tests. At the persistence check these additions were uncommitted and absent from this spec's base checkout. That historical snapshot was dependency evidence, not integrated implementation or qualification.

**Hook dependency commit: `39c77a0e0ddc9cc6bc631b35f571eaee49a87058`.** The maintainer explicitly authorized reviewing and committing the existing hook snapshot in a separate worktree. Its source runtime, guidance and tests were preserved byte-for-byte; the snapshot corrected public spec ADR companion links and added its ADR validation command. Owning local gates passed before the commit. The original writer's worktree was not changed. This implementation applies that fixed commit and reuses `build_registration()`; the snapshot does not establish native host qualification.

The installed CLI observed during planning was 0.157.0. Earlier Jev integration documentation discussed 0.154.0; neither version number establishes complete eligible-inventory support. Recheck the actual version and effective context at qualification time.

## Requirements and acceptance criteria

1. WHEN a repository explicitly adopts the policy, setup SHALL record its local ADR mapping, authorized host scope and missing operational prerequisites. Adoption alone SHALL NOT activate a hook or authorize TypeSafe processing.
2. WHEN `render --host codex --policy repository-adopted` runs, it SHALL output a valid JSON hook fragment on stdout without reading or writing user configuration, ownership records, backups, credentials or task data. Unsupported argument combinations SHALL fail before configuration access.
3. The generated hook SHALL reuse the existing registration builder and emit only fixed trusted guidance. Hook input SHALL NOT be interpolated into instructions, sent to a provider, logged or retained.
4. WHEN a new actionable task begins, or its scope or available capabilities change materially, the agent SHALL consult Jev before substantive task work if adoption, activation, processing authority and reliable current eligibility are established. Unchanged continuations, confirmations, status requests and the consultation itself SHALL NOT cause repeated advice.
5. Advice SHALL use the existing `general` selection profile and `current` retrieval policy. It SHALL retain skills and tools, existing request/time limits and the distinct selected, none, clarify, incomplete and error outcomes. It SHALL NOT silently select `next_skill`.
6. The agent SHALL derive capabilities only from current host evidence, preserve known invocation/account restrictions and explicit user skill choices, and validate recommended IDs before use. Installed files, missing flags, another session or unverified stale metadata SHALL NOT establish eligibility. Model-visible metadata SHALL NOT be labeled a complete authoritative inventory without proof.
7. Actual TypeSafe processing SHALL require existing explicit authorization for the scope and SHALL use a minimal task summary with bounded approved capability metadata. Secrets, private paths, customer data, raw transcripts, unrelated content and tool results SHALL be excluded. Model-mediated minimization SHALL NOT be presented as a deterministic redactor.
8. Missing authority, credentials, reliable inventory or integration, as well as provider failure, timeout or cancellation, SHALL preserve native selection and name the unmet obligation. There SHALL be no new retry loop or false success claim. Skipped unchanged messages SHALL not produce status spam.
9. Existing permission and Plan/read-only constraints SHALL remain effective during consultation preparation, catalog export and receipt handling. If the permitted path cannot prepare valid inputs without forbidden writes, it SHALL fall back rather than bypass the constraint.
10. Audit SHALL report evidence without changing the repository or host configuration. Installed, configured, effectively active/trusted, authorized for processing and practically qualified SHALL remain distinguishable.
11. Repository adoption SHALL NOT spread the requirement to non-adopting repositories. A global registration must evaluate each current repository's applicable policy and authorization; the repository's claim alone cannot supply missing host-owner authority.
12. A qualified claim SHALL identify the exact observed host/runtime/configuration and model/reasoning context. Documentation, unit fixtures and registration presence SHALL NOT replace native advice and adoption observations.

## Design and interfaces

The flow is:

`UserPromptSubmit -> fixed reminder -> agent checks policy and authority -> current eligible catalog and minimal task summary -> existing Jev Recommend -> host validates advice -> substantive task work`

Inventory and consultation preparation belong to the bootstrap, not substantive repository implementation. Advice starts after model processing begins. Explicit user choices and the host's actual call permissions remain authoritative throughout.

Extend the existing manager with:

```text
python3 scripts/jev_hooks.py render --host codex --policy repository-adopted
```

Reuse `build_registration()` with a separate fixed policy-guidance asset. Return an object containing `hooks.UserPromptSubmit` with the generated matcher group. The render path must bypass manager installation/state-location/ownership code. It may read its packaged guidance and determine the existing interpreter required by the builder; it must not inspect user hook configuration. Preserve existing install, status, uninstall and other-host behavior.

The output is a reviewable fragment, not a replacement for an existing configuration file. Application, deduplication and removal use the host owner's configuration management. Preserve normal Codex hook review, managed policies and unrelated hooks. Do not add active plugin-root hooks or rewrite canonical skill metadata in a projection.

A model uses the current conversation and host evidence to decide whether a change is material. Known capability additions/removals, changed activation restrictions or a changed requested outcome invalidate the prior advice. When continuity or eligibility cannot be established, do not claim a reused consultation is current. Preserve all existing advisor coverage limitations.

Setup and audit use existing Compass instruction/report surfaces; no new Compass runtime service or executable discovery mechanism is introduced.

## Architectural decisions

- ADR required: **yes**.
- Accepted decision: [ADR-0058](../adrs/0058-require-qualified-jev-host-advice-after-repository-adoption.short.md) ([Long, canonical](../adrs/0058-require-qualified-jev-host-advice-after-repository-adoption.long.md) · [Guide](../adrs/0058-require-qualified-jev-host-advice-after-repository-adoption.guide.md)).
- Existing integration authority: [ADR-0057](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.short.md) ([Long, canonical](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) · [Guide](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.guide.md)).
- Public contract promotion: [ADR-0039](../adrs/0039-separate-internal-skill-implementation-policy-from-exposed-contracts.short.md) ([Long, canonical](../adrs/0039-separate-internal-skill-implementation-policy-from-exposed-contracts.long.md) · [Guide](../adrs/0039-separate-internal-skill-implementation-policy-from-exposed-contracts.guide.md)).
- Projection ownership: [ADR-0043](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)).
- Supersedes: none. Preserve ADR-0057 and its accepted decision digest.
- ADR acceptance gate: **satisfied on 2026-09-25**. Hook dependency gate: **satisfied by `39c77a0e0ddc9cc6bc631b35f571eaee49a87058`**.
- Public policy: **AC-ADR-065**, Accepted, target-repository and `Adoptable: true`. AC-ADR-059 through AC-ADR-064 were already allocated in available repository history; the public ID was rechecked before integration. After incorporating the current PR base, this branch carries the exact public set 001–063 plus 065; AC-ADR-064 remains allocated outside main.
- Policy exposure, repository adoption, global activation, data-processing authority, qualification and release remain separate.

## Source challenge

Repository instructions, spec/ADR conventions, the accepted integration and projection decisions, Jev's catalog/session contracts, Compass catalog/validator/eval surfaces and the separate hook prototype were inspected.

The official [Codex hook reference](https://learn.chatgpt.com/docs/hooks#userpromptsubmit) supports fixed additional context at UserPromptSubmit, with independent [hook trust](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks). The [app-server discovery reference](https://learn.chatgpt.com/docs/app-server#skills) and [skill invocation policy](https://learn.chatgpt.com/docs/build-skills#optional-metadata) distinguish availability declarations from effective restrictions.

The challenge changed the initial pre-model-advice assumption to model-mediated consultation. It also replaced a second adapter implementation with reuse of the separate hook feature plus a pure renderer. Existing global installers are preserved, but are not invoked by this work.

Documentation and the installed package did not establish a complete current eligibility export. No native hook or provider run was performed during planning/persistence. Public claims therefore remain gated on the actual evidence described below.

## User verification

On 2026-09-25 the maintainer explicitly selected:

- Publicly adoptable policy with a functional first Codex CLI adapter.
- Model-mediated consultation, skills and tools through general/current, and new/material-change triggers.
- Native fallback with a visible unmet obligation, plus minimal task summaries and approved capability metadata.
- A generator and instructions rather than applying configuration in this scope.
- Native CLI scenarios plus a real synthetic TypeSafe smoke.
- Public persistence, reuse of the parallel hook work and an initially Proposed ADR.

The maintainer confirmed the final checkpoint as complete and first authorized save-only persistence. The subsequent explicit approval on 2026-09-25 accepts ADR-0058 and authorizes implementation while preserving the immutable hook-dependency prerequisite. The maintainer then authorized reviewing and committing the hook snapshot separately and using a disposable validation index for projection checks, without staging this working checkout or committing the governance feature at that stage. On 2026-09-26 the maintainer requested a pull request, authorizing scoped staging, commits and branch publication. The pull request remains a draft while native acceptance gaps are open.

## Task breakdown and touched areas

### Phase 1: persist the proposal

Completed: the specification, initially Proposed ADR-0058 Short/Long/Guide and minimal `docs/adrs.md` index row were saved and validated in one assigned worktree. The companion execution prompt was returned before feature changes.

### Phase 2: accept and pin

ADR-0058 is explicitly accepted and its unchanged decision digest is recorded according to repository convention. The reviewed hook implementation is pinned to `39c77a0e0ddc9cc6bc631b35f571eaee49a87058`. Recheck worktree state, relevant instructions, numbering, builder interface and validation ownership. A missing dependency remains a stop, not an invitation to reconstruct the feature.

### Phase 3: implement

- Add the pure renderer, fixed policy guidance and focused tests to the existing Jev module and evaluation suite.
- Add the accepted AC-ADR triplet and synchronize its catalog, lineage, decision lock, setup/report matrix, validator inventories and behavioral scenarios.
- Update Compass setup/audit dispatch and the relevant existing Jev/Compass documentation. Preserve unrelated workflows, installer contracts and host support.
- Synchronize bundled projections from canonical sources and inspect generated changes. No hand edits to plugin copies.

### Phase 4: qualify

Run owning local gates, then isolated native CLI scenarios and the bounded real smoke. Produce sanitized qualification evidence in the existing Jev evaluation documentation; keep raw payloads, host configuration and credentials out of versioned files. Do not label unavailable evidence passed or claim completion when the required real advice path fails.

## Validation

For governance persistence and acceptance:

```sh
pnpm run validate:adrs
pnpm exec oxfmt --config oxfmt.json --ignore-path .oxfmtignore --threads=1 --check docs/specs/jev-host-governance-spec.md docs/adrs/0058-require-qualified-jev-host-advice-after-repository-adoption.short.md docs/adrs/0058-require-qualified-jev-host-advice-after-repository-adoption.long.md docs/adrs/0058-require-qualified-jev-host-advice-after-repository-adoption.guide.md
git diff --check
```

Check the single index-row addition against the existing index style without reformatting unrelated rows. Include untracked artifacts in relative-link, whitespace, privacy and scope inspection. Before PR authorization, the working checkout remained unstaged and the explicitly authorized disposable validation index tracked reviewed inputs solely for projection generation and validation. The subsequent PR request permits staging and committing the scoped implementation, incorporating the current base, and pushing its branch; it does not authorize merge, release or global activation.

For the later feature:

```sh
pnpm run validate:adrs
pnpm run validate:architecture-compass
pnpm run validate:skills
pnpm run validate:jev
pnpm run validate:scripts
pnpm run sync:agent-plugin
pnpm run validate:projections
pnpm run validate:plugin-evals
```

Use focused formatting checks on changed supported files. Add another owning gate only if that contract changes. There is no release intent in this scope; do not run the full aggregate merely to finalize.

### Native acceptance protocol

Pin a baseline CLI version, runtime source identity, hook definition, effective configuration, synthetic capability set and existing configured model/reasoning combination before the first run. Keep CLI/runtime/model/reasoning fixed. Predeclare the scenario-specific repository, capability, authorization, credential, failure and hook-removal transitions below; record their before/after state and restore the baseline between independent cases. Retain every attempt. Unplanned material drift invalidates affected evidence and requires requalification. Use normal hook trust in isolated host configuration; do not modify the real global setup or bypass trust.

| Scenario                       | Required observation                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two repository contexts        | One user-level registration is actually loaded; adopting and authorized contexts show bootstrap, real helper invocation, advice disposition and then the first substantive action. |
| Same task and material changes | Unchanged continuation/status causes no repeated advice; a new task, changed task scope and changed capability evidence each cause a new consultation when eligible.               |
| Scope and authority            | A non-adopting repository or missing processing authority causes no policy-driven provider call; report unmet prerequisites in the adopted scope without blocking native work.     |
| Availability and restrictions  | Disabled, explicit-only, unavailable, stale or unverified candidates cannot gain eligibility through advice; explicit user skill selection remains authoritative.                  |
| Failure and removal            | Missing key, controlled provider error/timeout/cancellation and removal of the policy fragment preserve native execution without retry loops or false qualification.               |
| Outgoing data                  | Controlled transport capture contains only the minimal synthetic summary and approved metadata; raw prompt markers, private paths, secrets and tool-result canaries are absent.    |
| Plan/read-only constraints     | The guidance causes no forbidden catalog, receipt, cache or configuration write; an unavailable allowed path falls back truthfully.                                                |

Controlled replies prove hook behavior, ordering and failure handling only. Complete one additional genuine TypeSafe consultation with synthetic data through the native CLI path, using the existing general/current profile and its bounded request count. Do not add retries or turn the smoke into a benchmark. Missing provisioned credentials or failed inventory evidence leaves this required smoke incomplete.

## Rollout, rollback and risks

Publishable source changes do not authorize publication or user-wide activation. An operator reviews the rendered fragment, discloses and authorizes the actual processing scope, applies it through their configuration owner, reviews hook trust and checks the matching qualification evidence. Qualify a bounded adopted repository before extending the opted-in scope.

If the integration misbehaves, remove only the applied policy fragment through the same configuration management, preserving other hooks, credentials and installer-owned state. Native selection remains usable. A rollback does not silently erase the repository's adoption or claim compliance.

The main risks are model-mediated trigger/minimization errors, missing current inventory, stale host qualification, duplicate hook registration and accidental scope expansion. Fixed guidance, separate evidence states, scoped processing, native fallbacks and observed transport payloads address these without promising a deterministic privacy filter or universal host support.

## Artifact status and done-when

Spec destination follows the repository's publishable-spec convention; the maintainer explicitly selected public persistence. The spec and Accepted ADR triplet with its decision lock are the current saved outcome. The hook dependency is pinned; public AC-ADR-065, the pure renderer, fixed policy guidance, setup/audit behavior, evaluations and generated projections are implemented. Required local gates pass. The [Jev evaluation record](../../skill-evals/jev-capability-advisor/README.md#repository-policy-qualification) records 13 native turns and one successful, explicitly requested synthetic TypeSafe consultation. General automatic-advice qualification remains open: reliable current host restrictions, positive automatic new/material-change consultations and the remaining native acceptance cases are not fully established. Source implementation is complete; overall native acceptance is partial.

The persistence phase is done when the five intended documents exist, their focused checks pass, existing accepted decisions/index state are preserved, and the companion execution prompt is returned.

The later implementation is done only when the ADR is accepted, the dependency commit is fixed, policy and runtime contracts agree, required local/native/provider evidence passes and limitations are accurately documented. A configured reminder or successful synthetic fixture alone does not meet that bar.

## Companion Codex execution prompt

```text
Continue docs/specs/jev-host-governance-spec.md in an assigned agent-skills
worktree. First reconcile the implementation status and current qualification
record; reuse exact current evidence and act only on remaining obligations.
Verify acceptance of ADR-0058 and the pinned existing Jev hook implementation.
If either prerequisite is absent, report it and stop before feature edits. Preserve other worktrees, Git index state,
accepted ADR decisions, host configuration and credentials.

Preserve the implemented hook builder reuse, pure Codex renderer,
repository-adopted guidance, public Compass policy, setup/audit behavior and
the owning documentation/evaluations. Keep general/current,
processing authority, current eligibility requirements and native fallback.
Generate plugin projections from canonical sources.

Reuse the spec's exact current checks and native observations; resolve remaining
qualification gaps only with current eligibility evidence and authorized
scenarios. The single bounded real TypeSafe smoke has completed; do not repeat
it without a newly authorized provider scope. Record exact evidence inputs
and report missing/failed proof honestly. The maintainer authorized scoped
commits, a branch push and a draft PR; preserve that boundary. Do not merge,
release or activate the real global hook as part of this task.
```
