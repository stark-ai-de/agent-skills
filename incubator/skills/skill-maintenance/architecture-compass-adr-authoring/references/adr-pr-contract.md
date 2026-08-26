# Architecture Compass ADR PR Contract

Use this contract for the repository-specific mechanics behind the skill workflow. Re-read the live repository instructions and scripts before execution; they remain authoritative if this reference drifts.

## Requirements draft

Create the requirements list before assigning ADR identities or writing prose.

- Use one clear requirement per bullet.
- State the durable outcome, boundary, or failure behavior rather than a one-off implementation.
- Make the requirement applicable to multiple repositories unless the decision is explicitly about Architecture Compass runtime behavior.
- Preserve explicit `MUST`, `SHOULD`, and `MAY` strength only when the source request supports it.
- Keep examples and repository-local adoption notes outside the generic requirement itself.
- Separate assumptions, unresolved choices, and non-goals from requirements.
- Include proof or acceptance behavior when the decision would otherwise be unverifiable.

Keep this list in the pull request under `## Requirements`.

## Decision and namespace mapping

Architecture Compass and this repository use separate identities:

| Surface                                      | Identity                                                              | Default scope       | Adoptable |
| -------------------------------------------- | --------------------------------------------------------------------- | ------------------- | --------- |
| Reusable Architecture Compass decision       | `AC-ADR-NNN`                                                          | `target-repository` | `true`    |
| Architecture Compass implementation policy   | `AC-ADR-NNN` or `AC-INTERNAL-NNN` as governed by the current catalogs | `skill-runtime`     | `false`   |
| Local adoption in `stark-ai-de/agent-skills` | `ADR-NNNN`                                                            | `repository`        | `false`   |

Allocate each ID from its live index. Similar numbers are optional and never evidence that two records are synchronized.

Use `Proposed` for a first review PR unless the maintainer has explicitly accepted the decision. An accepted decision is immutable: change it through a reviewed successor, reciprocal supersession metadata, and the owning decision-lock update.

## Triplet contract

Each decision has exactly:

- `<stem>.short.md`
- `<stem>.long.md`
- `<stem>.guide.md`

Shared metadata must match except for `Variant`. Long is canonical and normative. Short is a faithful abstraction. Guide is non-normative application and verification help.

### Short style

Keep Short compact and on-point:

- Use the repository's current Short template and headings.
- Lead with the chosen outcome.
- Keep only the context needed to understand why the decision exists.
- Express the essential rules as direct bullets.
- Name the primary benefit, trade-off, and material risk.
- Do not repeat implementation recipes, exhaustive alternatives, source lists, or validation commands from Long or Guide.
- Do not add an obligation that is absent from Long.

### Long content

Long should contain one coherent decision and enough durable detail to govern implementation:

- context and problem;
- considered options;
- decision and invariants;
- conflict or precedence handling;
- failure behavior;
- consequences and risks;
- acceptance criteria;
- supersession where explicitly approved.

### Guide content

Guide may contain:

- application procedure;
- examples and repository mapping;
- current commands or product-specific mechanics;
- validation guidance;
- official sources with verification dates;
- decision lineage required by the current Architecture Compass contract;
- revisit triggers.

## Owning surfaces

For a reusable public Architecture Compass ADR, inspect and update as required:

- `skills/engineering-workflows/architecture-compass/references/<ac-stem>.{short,long,guide}.md`
- `skills/engineering-workflows/architecture-compass/references/adr-catalog.md`
- `scripts/validation/architecture-compass/decision-lineage.json`
- `scripts/validation/architecture-compass/decision-lock.tsv` only when the decision enters a locked final status
- `skills/engineering-workflows/architecture-compass/SKILL.md` only when routing or exposed behavior must change
- generated `plugins/stark-ai-developer/` projection via `npm run sync:agent-plugin`

For the repository-local adoption, inspect and update as required:

- `docs/adrs/<repo-stem>.{short,long,guide}.md`
- `docs/adrs.md`
- `scripts/validation/adrs/decision-lock.tsv` only when the decision enters a locked final status
- `AGENTS.md`, `CONTEXT.md`, or owning documentation only where the accepted local decision needs an effective instruction surface

Use `npm run adr:new -- "<title>" ...` for the repository triplet when its current behavior fits. Otherwise follow the live templates and validator contract exactly.

Do not edit `plugins/stark-ai-developer/` by hand.

## Conflict handling

Search both namespaces and open work before drafting. Record each material result with:

| ADR or PR | Status | Relationship | Conflict | Affected scope | Proposed resolution |
| --------- | ------ | ------------ | -------- | -------------- | ------------------- |

A detected conflict does not block creation of the requested first PR. It does block silent adoption or implementation that violates an accepted decision.

- Keep the proposed ADR in the PR.
- Name the conflicting ADR and the exact incompatible outcome.
- State whether the proposal overlaps, adapts, diverges, or is intended as a successor.
- Do not change predecessor status or reciprocal supersession fields without explicit decision authority.
- Put unresolved choices under `## Conflicts and review decisions` in the PR body.

Use `None found` only after searching the current catalogs, related text, and open pull requests.

## Focused validation

Inspect current scripts before running them. The normal focused set is:

```bash
npm run sync:agent-plugin
npm run validate:skills
npm run list:incubator
npm run validate:adrs
npm run validate:architecture-compass
npm run validate:projections
pnpm format:check
git diff --check
```

Run synchronization before projection validation. Add checks for any changed instruction, catalog, release, or site contract. Run `npm run validate` only when release intent, repository policy, an approved risk plan, or the user requires the aggregate.

Report each command as passed, failed, or not run. Local success does not prove hosted CI, publication, deployment, or production behavior.

## Git and pull request

- Branch from current `main` with a focused `feat/...` name.
- Use the repository's conventional commit scope.
- Keep generated output in the same reviewed branch as its source change.
- Create one first PR containing the paired ADRs, required synchronization, and conflict report.
- Do not merge, release, publish, deploy, or modify production state without separate authority.
