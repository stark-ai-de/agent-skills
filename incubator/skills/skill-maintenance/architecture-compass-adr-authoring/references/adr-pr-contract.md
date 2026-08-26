# Architecture Compass ADR PR Contract

Use this contract for the repository-specific mechanics behind the skill workflow. Re-read the live repository instructions and scripts before execution; they remain authoritative if this reference drifts. Perform every repository write in one assigned external worktree and keep the canonical checkout read-only. If the host cannot enforce that boundary, stop and provide exact setup guidance.

## Requirements draft

Create the requirements list before assigning ADR identities or writing prose.

- Use one clear, self-contained, independently reviewable requirement per bullet.
- State the durable outcome, boundary, or failure behavior rather than a one-off implementation.
- Make the requirement applicable to multiple repositories.
- Preserve explicit `MUST`, `SHOULD`, and `MAY` strength only when the source request supports it.
- Keep examples and repository-local adoption notes outside the generic requirement itself.
- Separate assumptions, unresolved choices, and non-goals from requirements.
- Include proof or acceptance behavior when the decision would otherwise be unverifiable.

Keep this list in the pull request under `## Requirements`.

## Decision and namespace mapping

This paired-adoption workflow accepts one exposed, reusable Architecture Compass decision and one local adoption. It does not author Architecture Compass implementation policy:

| Surface                                      | Identity     | Scope               | Adoptable |
| -------------------------------------------- | ------------ | ------------------- | --------- |
| Reusable Architecture Compass decision       | `AC-ADR-NNN` | `target-repository` | `true`    |
| Local adoption in `stark-ai-de/agent-skills` | `ADR-NNNN`   | `repository`        | `false`   |

Allocate each ID from its live index. Similar numbers are optional and never evidence that two records are synchronized.

The two namespaces have different status contracts:

- The shipped Architecture Compass public inventory permits only `Accepted` and `Superseded`. A new public record therefore needs explicit maintainer approval for its intended post-merge `Accepted` status before its triplet is authored. Until then, keep only the requirements and conflict draft outside the runtime inventory and stop before PR creation. The branch content is a proposal for review and is not active authority before merge.
- A new repository-local adoption defaults to `Proposed` unless the maintainer separately approves another status.
- An accepted decision is immutable. A successor requires explicit transition authority, reciprocal supersession metadata, and the owning decision-lock updates.

A decision classified as `skill-runtime` or `AC-INTERNAL-*` is outside this paired workflow because it cannot create a target-repository adoption obligation.

## Triplet contract

Each decision has exactly:

- `<stem>.short.md`
- `<stem>.long.md`
- `<stem>.guide.md`

Within each namespace, sibling metadata must match except for `Variant`. Long is canonical and normative. Short is a faithful abstraction. Guide is non-normative application and verification help. The provider and local triplets express the same decision at different scopes but retain independent IDs, statuses, metadata, and native headings.

For the Architecture Compass provider triplet, derive the exact structure from current exposed `AC-ADR-*` siblings and `scripts/validation/architecture-compass/validate.mjs`. Do not use `skills/engineering-workflows/architecture-compass/assets/adr-template.*.md`; those are derived target-repository adoption templates, not provider-authoring templates. For this repository's local triplet, use `docs/adrs/TEMPLATE.*.md` or `npm run adr:new -- ...` when the live generator fits.

### Short style

Keep Short compact and on-point:

- Use each namespace's current Short headings and structure.
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

- an explicit statement that the Guide is non-normative;
- application procedure;
- examples and repository mapping;
- current commands or product-specific mechanics;
- validation guidance;
- official sources with verification dates;
- decision lineage required by the current Architecture Compass contract;
- revisit triggers.

## Owning surfaces

For a reusable public Architecture Compass ADR, update every owning surface required by the live contracts:

- `skills/engineering-workflows/architecture-compass/references/<ac-stem>.{short,long,guide}.md`
- `skills/engineering-workflows/architecture-compass/references/adr-catalog.md`
- `scripts/validation/architecture-compass/validate.mjs` approved ID, stem, category, scope, and inventory declarations
- `scripts/validation/architecture-compass/decision-lineage.json`, with exactly one disposition for every public ID
- `scripts/validation/architecture-compass/decision-lock.tsv`, because shipped public records have a locked final status
- `skills/engineering-workflows/architecture-compass/SKILL.md`, increasing `metadata.version` for the public skill change and changing routing only when exposed behavior requires it
- affected Architecture Compass eval inventories and cases only when routing, behavior, or an existing proof claim changes

For the repository-local adoption, inspect and update as required:

- `docs/adrs/<repo-stem>.{short,long,guide}.md`
- `docs/adrs.md`
- `scripts/validation/adrs/decision-lock.tsv` only when the decision enters a locked final status
- `AGENTS.md`, `CONTEXT.md`, or owning documentation only where the accepted local decision needs an effective instruction surface

The promoted skill change creates release intent. Prepare the required repository package version and `CHANGELOG.md` release section through the live release helper or owning contract. Because Architecture Compass is bundled, inspect and update `plugins/stark-ai-developer.source.json` release identity and derived listing surfaces when the current plugin release contract requires a new plugin version. Then run `npm run sync:agent-plugin` so the committed portable projection derives from canonical sources.

Do not edit `plugins/stark-ai-developer/` by hand.

## Conflict handling

Search both namespaces and open work before drafting. Record each material result with:

| ADR or PR | Status | Relationship | Conflict | Affected scope | Proposed resolution | Decision owner |
| --------- | ------ | ------------ | -------- | -------------- | ------------------- | -------------- |

After the namespace, status, and authority gates are satisfied, a detected conflict does not block creation of the requested first PR. It does block silent adoption or implementation that violates an accepted decision.

- Keep both paired triplets in the PR.
- Name the conflicting ADR and the exact incompatible outcome.
- State whether the proposal overlaps, adapts, diverges, or is intended as a successor.
- Do not change predecessor status or reciprocal supersession fields without explicit decision authority.
- Name the owner of every unresolved decision.
- Put conflict-bound choices in the conflict table and all other unresolved choices under `## Remaining review decisions` in the PR body.

Use `None found` only after searching the current catalogs, related text, and open pull requests.

## Validation

Inspect current scripts before running them. Synchronize generated output first, run the focused checks, and run the mandatory aggregate last:

```bash
npm run sync:agent-plugin
npm run validate:skills
npm run validate:adrs
npm run validate:architecture-compass
npm run validate:projections
npm run release:intent -- --base-ref origin/main
npm run release:validate -- --base-ref origin/main
pnpm format:check
git diff --check origin/main...HEAD
npm run validate
```

Run `npm run list:incubator` only when incubator discovery changes. Add owning checks for every changed instruction, catalog, release, listing, eval, or site contract. This workflow materially changes a promoted skill and prepares release intent, so the local aggregate is a mandatory final proof after focused checks stabilize.

Report each check with exactly one status: `verified`, `failed`, `not run`, `unavailable`, or `stale`. Bind the final receipt to the clean candidate commit SHA, command or observation, evidence stage, result, time or freshness boundary, and material limitations. Run the final range checks after committing, confirm `HEAD` is that candidate, and do not use committed-only evidence to describe uncommitted bytes. Local success does not prove hosted CI, publication, deployment, installation, or production behavior.

## Git and pull request

- Branch from current `main` with a focused `feat/...` name in the assigned external worktree; never use the canonical checkout as a fallback write location.
- Use the repository's conventional commit scope.
- Keep generated output in the same reviewed branch as its source change.
- Require a clean worktree and identify the exact candidate commit before recording final validation evidence or creating the PR.
- Put `## Requirements` before the repository-specific summary in the PR body.
- Create one first PR containing the paired ADRs, required synchronization and release metadata, conflict report, candidate-bound evidence, and remaining review decisions.
- Do not merge, release, publish, deploy, or modify production state without separate authority.
