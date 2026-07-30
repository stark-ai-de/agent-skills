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

Run:

```bash
npm run validate
npm run list
npm run list:incubator
npm run smoke:fingerprint
npm run smoke:install
```

The `npx` command requires network access the first time the CLI is fetched.

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
- [ ] `npm run validate` passes.
- [ ] `npx skills@latest add ./skills --list` works for local catalog discovery.
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
