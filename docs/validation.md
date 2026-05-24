# Validation

Validation keeps the promoted public skill catalog and incubator candidates compatible with the open Agent Skills specification and the lightweight ADR rules.

## Commands

List public skills:

```bash
npm run list
```

List incubator skills:

```bash
npm run list:incubator
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

Validate script syntax:

```bash
npm run validate:scripts
```

Check local public install discovery:

```bash
npx skills@latest add ./skills --list
```

Run the clean-copy public install smoke test:

```bash
npm run smoke:install
```

Optional Oxc checks:

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm lint:actions
```

`pnpm lint:actions` prefers an official `actionlint` binary when one is available on `PATH`, then falls back to the pinned `github-actionlint` dev dependency installed by `pnpm install`. Cursor and VS Code users should install the recommended `jimeh.actionlint` extension; the workspace settings point it at `node_modules/.bin/github-actionlint` for immediate inline diagnostics after dependency install.

Validate release readiness:

```bash
node scripts/prepare-release.mjs --version 0.1.0 --dry-run
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs
node scripts/print-release-notes.mjs
```

## What Validation Checks

- `skills/**/SKILL.md` exists for promoted public skills.
- `incubator/skills/**/SKILL.md` is validated when incubator candidates exist.
- Frontmatter starts the file.
- `name` and `description` are present.
- `name` matches the parent folder.
- `name` follows agentskills.io constraints: 1 to 64 characters, lowercase letters, numbers, and single hyphens, with no leading or trailing hyphen.
- `description` is non-empty, no more than 1024 characters, and includes use-trigger language.
- `compatibility` is no more than 500 characters when present.
- `SKILL.md` stays under 500 lines.
- Skill bodies include the universal skill section contract: goal, use and non-use cases, inputs, workflow, safety rules, references, scripts, output format, completion criteria, and failure modes.
- README includes install commands.
- Every public category with promoted skills has a `skills/<category>/README.md`.
- Every incubator category has an `incubator/skills/<category>/README.md`.
- Category README files link each skill and include the exact `SKILL.md` frontmatter description.
- Category README files state that third-party helper skills live outside the public catalog under `.agents/skills/`.
- Incubator category README files state that incubator skills are not part of the public catalog.
- Incubator skills set `metadata.internal: true` so root `npx skills` discovery hides them unless `INSTALL_INTERNAL_SKILLS=1` is explicitly set.
- Skill scripts avoid obvious high-risk shell patterns.
- GitHub Actions workflows pass `actionlint` through `pnpm lint:actions`.
- Known upstream helper skills are not vendored under `skills/`; they belong in local ignored `.agents/skills/` installs.
- ADR files use the short template, allowed status values, sequential filenames, and a 250-word hard limit.
- `smoke:install` checks a clean copy without `.agents/skills/`, verifies public skills are listed when present, allows an empty public catalog, and fails if incubator skills leak into public discovery.
- Release-intent detection checks whether a PR changed `package.json` version, added a `CHANGELOG.md` release heading, or changed public skill `metadata.version`.
- Release validation checks package version, `CHANGELOG.md`, public skill metadata versions, and public skill validation before a tag is created.
- Script syntax validation checks repository Node scripts and skill shell scripts.

## Continuous Integration

The `Validate` workflow runs on pushes to `main`, pull requests, and manual dispatch. It runs `npm run validate`, `pnpm format:check`, `pnpm lint`, and `npx skills@latest add . --list`. `npm run validate` includes actionlint for GitHub Actions workflows. On pull requests, it also runs release validation when release intent is detected so partial version, changelog, or public skill metadata updates fail before merge.

`Prepare Release` runs only through manual dispatch. Its dry run prepares files in the ephemeral runner so validation can inspect the would-be release tree, but it does not commit or open a PR. `Publish Release` runs only through manual dispatch. Keep `dry_run` set to `true` for a final readiness check, then rerun with `dry_run` set to `false` only after maintainer approval.

Warnings are not always blockers, but new warnings should be reviewed before publishing.
