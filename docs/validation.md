# Validation

Validation keeps the public skill catalog compatible with the open Agent Skills specification and the lightweight ADR rules.

## Commands

List skills:

```bash
npm run list
```

Validate skills:

```bash
npm run validate
```

Validate only skills:

```bash
npm run validate:skills
```

Validate only ADRs:

```bash
npm run validate:adrs
```

Check local install discovery:

```bash
npx skills@latest add ./skills --list
```

Optional Oxc checks:

```bash
pnpm install
pnpm format:check
pnpm lint
```

## What Validation Checks

- `skills/**/SKILL.md` exists.
- Frontmatter starts the file.
- `name` and `description` are present.
- `name` matches the parent folder.
- `name` follows agentskills.io constraints: 1 to 64 characters, lowercase letters, numbers, and single hyphens, with no leading or trailing hyphen.
- `description` is non-empty, no more than 1024 characters, and includes use-trigger language.
- `compatibility` is no more than 500 characters when present.
- `SKILL.md` stays under 500 lines.
- Skill bodies include the universal skill section contract: goal, use and non-use cases, inputs, workflow, safety rules, references, scripts, output format, completion criteria, and failure modes.
- README includes install commands.
- Skill scripts avoid obvious high-risk shell patterns.
- Known upstream helper skills are not vendored under `skills/`; they belong in `.agents/skills/` via `npx skills` and `skills-lock.json`.
- ADR files use the short template, allowed status values, sequential filenames, and a 250-word hard limit.

Warnings are not always blockers, but new warnings should be reviewed before publishing.
