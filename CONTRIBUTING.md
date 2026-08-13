# Contributing

This repository contains Agent Skills candidates and a promoted public catalog. Contributions should keep skills small, composable, inspectable, and safe for eventual public use.

## Skill Naming

- Use lowercase letters, numbers, and hyphens only.
- Keep names short and workflow-specific.
- Match the skill folder name exactly with the `name` field in `SKILL.md`.
- Avoid broad names such as `engineering-agent` or `do-everything`.

## Frontmatter

Every `SKILL.md` must start with YAML frontmatter:

```yaml
---
name: example-skill
description: Do one clear workflow. Use when the user asks for concrete trigger terms. Do not use when the task belongs to another skill.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---
```

`name` and `description` are required by the Agent Skills specification. This repository also uses `license: Apache-2.0` and simple metadata for catalog clarity. Incubator skills must set `metadata.internal: true`; remove that marker only during promotion. Put routing triggers in `description`; the skill body is loaded only after the skill triggers.

## Description Quality

- Front-load the object and workflow.
- Include trigger words near the start.
- Mention exclusions when they matter.
- Keep descriptions under 500 characters when possible.
- Avoid vague phrasing like "helps with repos."

## Safety Rules

- Do not include secrets, tokens, customer data, private repo paths, or internal hostnames.
- Do not copy substantial text from other skill repositories.
- Do not vendor already-published third-party skills into `skills/` or `incubator/skills/`; use project-local `npx skills` installs instead.
- Keep `skills/` promoted-only. Draft or experimental public candidates belong in `incubator/skills/` with `metadata.internal: true`; personal and private skills belong in ignored local folders or private repositories.
- If copying third-party material is explicitly required, verify the license and add source/license attribution before publishing.
- Prefer read-only scripts.
- Any script that can modify files must be documented in the owning skill and must require user approval before use.
- Do not add scripts that push, publish, close issues, approve PRs, or delete files by default.

## ADR Rules

Follow [`docs/adrs.md`](docs/adrs.md) for ADR scope, naming, status values, word limits, and index updates.

## Spec Rules

Follow [`docs/specs.md`](docs/specs.md) for spec persistence, filename examples, ADR linkage, safety review, and repo-facing documentation update rules.

## Validation

Select local checks from changed contracts and owning boundaries. [ADR-0046](docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.short.md) ([Long, canonical](docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · [Guide](docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.guide.md)) governs the hosted content-addressed task graph and trusted aggregate proof, while [ADR-0047](docs/adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.short.md) ([Long, canonical](docs/adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) · [Guide](docs/adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.guide.md)) governs the Architecture Compass hosted shards and local workers. Common repository gates are:

```bash
npm run validate
npm run validate:ci-contract
npm run list
npm run list:incubator
npm run smoke:fingerprint
npm run smoke:install
```

Run the local `npm run validate` aggregate for release intent or when another mandatory gate requires it. Hosted `Validate` remains unfiltered and mandatory with one stable required `validate` aggregator. Pull requests select the fail-closed union of compatible base and candidate plans; `main` pushes and every manual dispatch select the full logical gate set. Each selected gate is satisfied by either a current execution or an exact verified immutable result, and only misses create gate jobs or install dependencies. Pull-request results are computation evidence only; protected `main` independently assembles current Pages and release proof. Run catalog listing checks when discovery changes, and run fingerprint/install smoke checks when install behavior or the release payload changes.

`pnpm install` provides the exact root `skills@1.5.22` executable used by hosted CI. Use `pnpm exec skills add ./skills --list` for an exact local discovery reproduction. Hosted smoke passes that executable explicitly; a direct local `npm run smoke:install` retains the same exact-version `npx` fallback unless `SKILLS_SMOKE_CLI` is configured. Public `npx skills@latest` examples still require network access when the CLI is not already cached.

Optional Oxc checks:

```bash
pnpm install
pnpm format:check
pnpm lint
```

## Pull Request Checklist

- [ ] New or changed skills have valid frontmatter.
- [ ] Skill names match folder names.
- [ ] Descriptions include trigger words.
- [ ] Category README files match `SKILL.md` frontmatter.
- [ ] Incubator skills are not presented as public catalog entries.
- [ ] Promotion from `incubator/skills/` to `skills/` has proof in `skill-evals/` or a documented reason to skip it.
- [ ] Long rubrics, templates, and examples live in `references/` or `assets/`.
- [ ] Scripts are documented, deterministic, and safe.
- [ ] README skill catalog is current.
- [ ] ADR added if a repo-level decision changed.
- [ ] Checks required by ADR-0046, ADR-0047, and the changed contracts pass; release-intent work includes the local aggregate, and the stable hosted Validate check is green for the effective task graph.
- [ ] `pnpm exec skills add ./skills --list` works when local catalog discovery changed.
- [ ] `npm run smoke:install` passes when install smoke behavior changed.
- [ ] No private or sensitive data is included.

## Publishing Checklist

- [ ] README includes install, update, and compatibility sections.
- [ ] `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `AGENTS.md` exist.
- [ ] `docs/adrs/` exists and ADR validation passes.
- [ ] GitHub Actions validation is configured.
- [ ] No upstream helper skill is vendored into `skills/`.
- [ ] Incubator skills are not listed by public install discovery.

## Deprecation Policy

Do not delete skills abruptly. Add a deprecation notice to `SKILL.md`, identify the replacement skill, keep the deprecated skill for at least one minor release, update README, and add a changelog entry. Remove only after users have a migration path.

## Scope Boundaries

Use `docs/out-of-scope/` for stable boundaries that are not architectural enough for an ADR. Current defaults: do not vendor upstream skills, do not publish personal/private skills, do not add mega-skills, keep issue tracker automation limited unless demand justifies more, and promote incubator skills only when quality, utility, and maintenance fit are clear.
