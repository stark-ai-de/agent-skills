# Contributing

This repository contains public Agent Skills. Contributions should keep skills small, composable, inspectable, and safe for public use.

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
license: MIT
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---
```

`name` and `description` are required by the Agent Skills specification. This repository also uses `license: MIT` and simple metadata for public catalog clarity. Put routing triggers in `description`; the skill body is loaded only after the skill triggers.

## Description Quality

- Front-load the object and workflow.
- Include trigger words near the start.
- Mention exclusions when they matter.
- Keep descriptions under 500 characters when possible.
- Avoid vague phrasing like "helps with repos."

## Safety Rules

- Do not include secrets, tokens, customer data, private repo paths, or internal hostnames.
- Do not copy substantial text from other skill repositories.
- Do not vendor already-published third-party skills into `skills/`; use project-local `npx skills` installs instead.
- If copying third-party material is explicitly required, verify the license and add source/license attribution before publishing.
- Prefer read-only scripts.
- Any script that can modify files must be documented in the owning skill and must require user approval before use.
- Do not add scripts that push, publish, close issues, approve PRs, or delete files by default.

## ADR Rules

- Add an ADR when a repo-level decision changes format, publishing, validation, license, layout, or maintainer policy.
- Do not add ADRs for typo fixes, tiny copy edits, routine skill additions, or one-off implementation details.
- Keep ADRs under 250 words and use `docs/adr/TEMPLATE.md`.
- Do not rewrite accepted ADRs. Supersede them with a new ADR.

## Validation

Run:

```bash
npm run validate
npm run list
npx skills@latest add ./skills --list
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
- [ ] Long rubrics, templates, and examples live in `references/` or `assets/`.
- [ ] Scripts are documented, deterministic, and safe.
- [ ] README skill catalog is current.
- [ ] ADR added if a repo-level decision changed.
- [ ] `npm run validate` passes.
- [ ] `npx skills@latest add ./skills --list` works for local catalog discovery.
- [ ] No private or sensitive data is included.

## Publishing Checklist

- [ ] README includes install, update, and compatibility sections.
- [ ] `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `AGENTS.md` exist.
- [ ] `docs/adr/` exists and ADR validation passes.
- [ ] GitHub Actions validation is configured.
- [ ] No upstream helper skill is vendored into `skills/`.

## Deprecation Policy

Do not delete skills abruptly. Add a deprecation notice to `SKILL.md`, identify the replacement skill, keep the deprecated skill for at least one minor release, update README, and add a changelog entry. Remove only after users have a migration path.
