---
name: architecture-compass-adr-authoring
description: Author a new or successor public Architecture Compass target-repository ADR and its local adoption in stark-ai-de/agent-skills. Use when a maintainer supplies a decision idea or rough requirements and wants generic requirements, paired Short/Long/Guide triplets, conflict reporting, release synchronization, validation, and a GitHub pull request. Do not use for internal or skill-runtime ADRs or adoption in unrelated repositories.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: skill-maintenance
  version: "0.1.0"
---

# Architecture Compass ADR Authoring

## Goal

Turn rough decision notes into a reviewable first pull request that adds a reusable Architecture Compass decision and adopts the same decision in `stark-ai-de/agent-skills`, without making the maintainer restate the repository-specific PR prompt.

## When to use

- A maintainer wants to add a new public, target-repository Architecture Compass ADR or propose a successor to one.
- The input is a rough idea, discussion, or partial requirements list.
- The requested outcome includes a pull request in `stark-ai-de/agent-skills`.

## When not to use

- The task is to adopt an existing Architecture Compass ADR in another repository; use `architecture-compass`.
- The decision is Architecture Compass implementation policy or belongs in `AC-INTERNAL-*`; this paired-adoption workflow does not apply.
- The task only changes implementation under an already accepted ADR.
- The user has not authorized repository writes or pull-request creation; stop after the requirements draft.

## Inputs to inspect

- The user's decision intent, constraints, examples, and explicit exclusions.
- Current `main`, repository instructions, `docs/adrs.md`, `docs/adrs/TEMPLATE.*.md`, and relevant repository ADR triplets.
- `skills/engineering-workflows/architecture-compass/SKILL.md`, `skills/engineering-workflows/architecture-compass/references/adr-catalog.md`, and relevant exposed ADR triplets.
- `scripts/validation/architecture-compass/validate.mjs`, its decision lock and lineage files, release contracts, plugin source configuration, and generated projection rules.
- Open issues and pull requests that may already cover the same decision.

## Workflow

1. **Resolve authority, isolation, and baseline.** Confirm the target repository and requested PR outcome from the user's request. Require one assigned external worktree for every repository write, keep the canonical checkout read-only, and work from current `main`. If that isolation cannot be established, stop with concrete setup guidance. Never hand-edit generated plugin projections.
2. **Draft generic requirements first.** Convert the source request into a compact bullet list. Keep one self-contained, independently reviewable requirement per bullet, make the wording reusable across projects, separate outcomes from implementation notes, preserve explicit constraints, and include validation or failure behavior when material. Remove repository paths, personal names, and one-off examples unless they are essential to the decision. Record assumptions separately instead of silently converting them into requirements.
3. **Check overlap and conflicts.** Search both ADR namespaces by decision, trigger, tags, and affected boundary. Classify the proposal as new, overlapping, conflicting, or a successor. Do not rewrite an accepted decision in place. Continue preparing the PR when conflicts exist, but identify every relevant ADR and the unresolved impact.
4. **Resolve namespace, status, and identities.** This workflow accepts only an exposed `AC-ADR-NNN` with `Scope: target-repository`; reclassify an internal or skill-runtime decision and stop before paired authoring. The shipped Architecture Compass inventory permits only `Accepted` or `Superseded`. For a new record, require the maintainer to approve the intended post-merge `Accepted` status before authoring; without it, return the requirements and conflict draft and stop. Default only the repository-local adoption to `Proposed` unless its status is separately approved. Then select independent unused IDs from the live catalogs.
5. **Author the paired triplets.** Add Short, Long, and Guide variants under the Architecture Compass references and under `docs/adrs/`. Derive the provider triplet from current exposed siblings and the validator; Architecture Compass's bundled `assets/adr-template.*.md` files are target-repository templates, not provider-authoring templates. Use the repository's own templates or generator for the local triplet. Long is canonical and contains one decision. Short is a faithful, compact, on-point abstraction with only the essential context, outcome, and trade-offs. Guide contains non-normative application, examples, verification, current sources, and required lineage.
6. **Synchronize owning surfaces and release metadata.** Update the complete approved Architecture Compass validator inventory, catalog, lineage manifest, accepted-decision lock, repository ADR index, and any required routing or eval surfaces. Update repository instructions only where an accepted local decision must become effective. Bump the promoted skill version and prepare the package version, changelog, plugin identity or listing surfaces, and other release metadata required by the live release contracts. Run the repository generator for the portable plugin projection; do not edit `plugins/stark-ai-developer/` directly.
7. **Validate changed contracts.** Run the focused ADR, skill, projection, release-intent, formatting, and diff checks described in the reference, plus owners for any changed release or listing surfaces. Run `npm run list:incubator` only if incubator discovery changed. Because this workflow materially changes a promoted skill and prepares release intent, run the required local aggregate after the focused checks stabilize.
8. **Create the first PR.** Use a focused branch and conventional commit title. Put the normalized requirements first in the PR body, followed by the paired ADR identities and paths, conflict report with decision owners, synchronization performed, candidate-bound validation evidence, unavailable checks, and all remaining decisions. Once the status gate is satisfied, a conflict is review information and is not a reason to omit either proposed triplet from the PR.

Do not ask the maintainer to paste the former long GitHub prompt. This workflow is its normalized replacement.

## Safety rules

- Never change an accepted ADR's normative decision merely to remove a conflict or satisfy validation.
- Never mark a proposal accepted, supersede an existing ADR, or change reciprocal supersession metadata without evidence of that decision.
- Never represent an unmerged Architecture Compass proposal as active authority; `Accepted` in the branch is the explicitly approved intended post-merge state.
- Keep public Architecture Compass content generic and free of private paths, customer data, secrets, internal hostnames, and chat-only provenance.
- Pull-request creation requires explicit user authority; merge, release, publication, deployment, and production changes require separate authority.
- Treat generated projections and lock files as controlled surfaces: update them only through their owning command or documented contract.
- Report validation by evidence stage and never imply that local checks prove hosted CI, publication, or deployment.

## References

Load [`references/adr-pr-contract.md`](references/adr-pr-contract.md) before authoring files or creating the PR. Use [`assets/pull-request-body.md`](assets/pull-request-body.md) when assembling the PR description.

## Scripts

No bundled scripts. Use only repository-owned ADR, projection, formatting, and validation commands after inspecting their current behavior.

## Output format

Return:

1. Generic requirements
2. ADR classification and selected identities
3. Files added or changed
4. Conflicts and their effect
5. Validation evidence and unavailable checks
6. Pull request link
7. Remaining review decisions

## Completion criteria

- The generic requirements are readable, portable, independently reviewable, and traceable to the source request.
- Architecture Compass and repository ADR triplets express the same decision at their respective scopes.
- Short variants are compact and do not relax or extend Long.
- Catalogs, validator inventory, lineage, locks, release metadata, instructions, and generated projections are synchronized where required.
- Every detected conflict is named in the PR body without silently changing accepted history.
- Focused validation has passed or each evidence gap is explicit.
- The pull request exists and contains the complete review context.

## Failure modes

- If the request does not contain one coherent architectural decision, split the requirements into candidate decisions and stop before assigning IDs.
- If the decision is internal/skill-runtime or the maintainer has not approved the new Architecture Compass record's intended post-merge status, return the requirements, classification, and conflict report and stop before authoring files or creating the PR.
- If the repository state changes during authoring, recheck and reconcile the base in the assigned worktree before creating the PR; do not rewrite published history without authority.
- If the required external worktree cannot be established, keep the canonical checkout read-only and return exact setup guidance.
- If an existing open PR already implements the same decision, report it and avoid creating a duplicate unless the user explicitly requests a competing proposal.
- If a required generator fails, stop because the candidate is incomplete. If a validator is unavailable, create the PR only when current contracts permit that evidence gap, name it exactly, and do not claim local or release readiness.
- If GitHub write access fails, return the prepared branch content and PR body without claiming that a PR was created.
