---
name: architecture-compass-adr-authoring
description: Add or supersede an ADR in Architecture Compass and create its repository-local adoption PR in stark-ai-de/agent-skills. Use when a maintainer supplies a decision idea or rough requirements and wants AI to produce generic requirements, compact Short/Long/Guide triplets, conflict reporting, synchronized projections, validation, and a GitHub pull request. Do not use for adopting existing ADRs into unrelated repositories.
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

- A maintainer wants to add a new Architecture Compass ADR or propose a successor to an existing one.
- The input is a rough idea, discussion, or partial requirements list.
- The requested outcome includes a pull request in `stark-ai-de/agent-skills`.

## When not to use

- The task is to adopt an existing Architecture Compass ADR in another repository; use `architecture-compass`.
- The task only changes implementation under an already accepted ADR.
- The user has not authorized repository writes or pull-request creation; stop after the requirements draft.

## Inputs to inspect

- The user's decision intent, constraints, examples, and explicit exclusions.
- Current `main`, repository instructions, `docs/adrs.md`, and relevant repository ADR triplets.
- `skills/engineering-workflows/architecture-compass/SKILL.md`, `references/adr-catalog.md`, related public or internal ADRs, and the ADR templates.
- Architecture Compass validation locks, lineage metadata, plugin source configuration, and generated projection rules.
- Open issues and pull requests that may already cover the same decision.

## Workflow

1. **Resolve authority and baseline.** Confirm the target repository and requested PR outcome from the user's request. Work from current `main`, follow the repository's assigned-worktree rules where available, and never hand-edit generated plugin projections.
2. **Draft generic requirements first.** Convert the source request into a compact bullet list. Keep one requirement per bullet, make the wording reusable across projects, separate outcomes from implementation notes, preserve explicit constraints, and include validation or failure behavior when material. Remove repository paths, personal names, and one-off examples unless they are essential to the decision. Record assumptions separately instead of silently converting them into requirements.
3. **Check overlap and conflicts.** Search both ADR namespaces by decision, trigger, tags, and affected boundary. Classify the proposal as new, overlapping, conflicting, or a successor. Do not rewrite an accepted decision in place. Continue preparing the PR when conflicts exist, but identify every relevant ADR and the unresolved impact.
4. **Allocate independent identities.** Select the next unused `AC-ADR-NNN` and repository `ADR-NNNN` from the live catalogs. Do not assume the numbers or filename stems must match. Default new decisions to `Proposed` unless the maintainer explicitly approved another status.
5. **Author the paired triplets.** Add Short, Long, and Guide variants under the Architecture Compass references and under `docs/adrs/`. Long is canonical and contains one decision. Short is a faithful, compact, on-point abstraction with only the essential context, outcome, and trade-offs. Guide contains non-normative application, examples, verification, current sources, and decision lineage when required.
6. **Synchronize owning surfaces.** Update the Architecture Compass catalog, repository ADR index, lineage manifest, and decision locks only when their contracts require it. Update repository instructions or documentation only where the new local ADR must become effective. Run the repository generator for the portable plugin projection; do not edit `plugins/stark-ai-developer/` directly.
7. **Validate changed contracts.** At minimum run the focused skill, incubator listing, repository ADR, Architecture Compass, and projection checks described in the reference. Add formatting and diff checks. Run the aggregate validation only when repository policy, release intent, or the user requires it.
8. **Create the first PR.** Use a focused branch and conventional commit title. The PR body must include the normalized requirements, paired ADR identities and paths, conflict report, synchronization performed, validation evidence, unavailable checks, and remaining decisions. A conflict is review information, not a reason to omit the proposed ADR.

Do not ask the maintainer to paste the former long GitHub prompt. This workflow is its normalized replacement.

## Safety rules

- Never change an accepted ADR's normative decision merely to remove a conflict or satisfy validation.
- Never mark a proposal accepted, supersede an existing ADR, or change reciprocal supersession metadata without evidence of that decision.
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

- The generic requirements are readable, portable, and traceable to the source request.
- Architecture Compass and repository ADR triplets express the same decision at their respective scopes.
- Short variants are compact and do not relax or extend Long.
- Catalogs, lineage, locks, instructions, and generated projections are synchronized where required.
- Every detected conflict is named in the PR body without silently changing accepted history.
- Focused validation has passed or each evidence gap is explicit.
- The pull request exists and contains the complete review context.

## Failure modes

- If the request does not contain one coherent architectural decision, split the requirements into candidate decisions and stop before assigning IDs.
- If the repository state changes during authoring, rebase or rebuild from current `main` before creating the PR.
- If an existing open PR already implements the same decision, report it and avoid creating a duplicate unless the user explicitly requests a competing proposal.
- If required generators or validators cannot run, create the PR only when the remaining diff is reviewable and list the exact missing evidence.
- If GitHub write access fails, return the prepared branch content and PR body without claiming that a PR was created.
