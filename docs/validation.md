# Validation

Validation keeps the promoted public skill catalog and incubator candidates compatible with the open Agent Skills specification, repository ADR-triplet contract, and skill-specific runtime contracts.

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

Validate the routed Architecture Compass ADR library and its eval contract:

```bash
npm run validate:architecture-compass
```

This gate verifies the complete 25-record Short/Long/Guide inventory, shared metadata and navigation, scope/adoption rules, accepted decision locks, catalog routing, derived assets, retired legacy references, and required lifecycle/eval cases. It also creates disposable temporary fixtures to prove that malformed libraries fail without modifying the repository.

Validate script syntax:

```bash
npm run validate:scripts
```

Validate the CodeGraph + ast-grep runtime contract and captured behavior:

```bash
npm run validate:codegraph-ast-grep
```

This dedicated gate is offline and deterministic. It statically checks the
installed skill contract and scenario catalog, verifies captured behavioral
artifact hashes, regrades assertions from committed final responses, and
reconciles grading totals. It does not invoke a model, query the network, or
execute CodeGraph/ast-grep.

Validate SkillOpt setup helper contracts:

```bash
npm run validate:skillopt
```

Build the GitHub Pages catalog:

```bash
pnpm --filter ./site build
```

Check local public install discovery:

```bash
npx skills@latest add ./skills --list
```

Run the clean-copy public install smoke test:

```bash
npm run smoke:install
```

Oxc and workflow checks:

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm lint:actions
```

`pnpm lint:actions` prefers an official `actionlint` binary when one is available on `PATH`, then falls back to the pinned `github-actionlint` dev dependency installed by `pnpm install`. Cursor and VS Code users should install the recommended `jimeh.actionlint` extension; the workspace settings point it at `node_modules/.bin/github-actionlint` for immediate inline diagnostics after dependency install.

Validate release readiness:

```bash
NEXT_VERSION=0.14.0
node scripts/prepare-release.mjs --version "$NEXT_VERSION" --dry-run
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --base-ref origin/main
node scripts/print-release-notes.mjs
```

## What Validation Checks

- `skills/**/SKILL.md` exists for promoted public skills.
- `incubator/skills/**/SKILL.md` is validated when incubator candidates exist.
- Frontmatter starts the file.
- Frontmatter parses as YAML, and `metadata.category` matches the path when present.
- `agents/openai.yaml` parses as YAML with typed `interface`, `policy`, and `dependencies` fields; resolved default prompts use current-host controls.
- `name` and `description` are present.
- `name` matches the parent folder.
- `name` follows agentskills.io constraints: 1 to 64 characters, lowercase letters, numbers, and single hyphens, with no leading or trailing hyphen.
- `description` is non-empty, no more than 1024 characters, and includes use-trigger language.
- `compatibility` is no more than 500 characters when present.
- `SKILL.md` stays under 500 lines.
- Skill bodies include the universal skill section contract: goal, use and non-use cases, inputs, workflow, safety rules, references, scripts, output format, completion criteria, and failure modes.
- Public skills set `metadata.version` with `x.y.z` semver.
- Codex/OpenAI default prompts name the selected skill and avoid foreign-host planning/question controls.
- README includes install commands.
- Every public category with promoted skills has a `skills/<category>/README.md`.
- Every incubator category has an `incubator/skills/<category>/README.md`.
- Category README files link each skill and include the exact `SKILL.md` frontmatter description.
- README and publishing install sets contain every portable public skill as a real `--skill` operand for each supported host.
- Category README files state that third-party helper skills live outside the public catalog under `.agents/skills/`.
- Incubator category README files state that incubator skills are not part of the public catalog.
- Incubator skills set `metadata.internal: true` so root `npx skills` discovery hides them unless `INSTALL_INTERNAL_SKILLS=1` is explicitly set.
- Skill scripts avoid obvious high-risk shell patterns.
- Oxc formatting and script linting pass through `pnpm format:check` and `pnpm lint`.
- GitHub Actions workflows pass `actionlint` through `pnpm lint:actions`.
- The Astro GitHub Pages catalog builds generated public and incubator skill routes from `SKILL.md`.
- README and publishing host-ready install sets include every portable public skill for Codex, Cursor, and Claude Code.
- Known upstream helper skills are not vendored under `skills/`; they belong in local ignored `.agents/skills/` installs.
- Repository ADRs form complete Short/Long/Guide triplets with stable IDs, accepted stem/decision locks, synchronized metadata, Long canonical authority, exact sibling navigation, reciprocal supersession, valid catalog routing, and no unsuffixed legacy paths or links.
- Architecture Compass validation checks its 25 routed ADR triplets, compact dispatcher, derived non-normative assets, and maintainer eval inventory.
- `smoke:install` checks a clean copy without local `.agents/` or `.codegraph/` state, verifies public skills are listed without incubator leaks, and performs disposable project-local Codex, Cursor, and Claude Code installs with exact destination assertions, Architecture Compass payload parity, and telemetry disabled.
- Release-intent detection checks whether a PR changed `package.json` version, added a `CHANGELOG.md` release heading, or changed public skill files.
- Release validation checks that the repository package version and changelog release section match, public skill `metadata.version` values are semver and do not exceed the package release, changed existing public skills increase their own version, and public skill validation passes before a tag is created.
- Script syntax validation checks repository Node scripts and skill shell scripts.
- CodeGraph + ast-grep contract validation checks the explicit installed-payload allowlist, fenced Markdown/config command snippets and their scanner fixtures, scenario structure, capability/update/rewrite safety invariants, captured behavioral artifact and candidate hashes, and machine-regraded assertion totals without executing analysis tools or a model.
- SkillOpt setup validation checks helper `--help` contracts, adapter template syntax, mode config contracts, benchmark hard-assertion coverage, and accidental private payload leakage.

Root `scripts/validate-*.mjs` files are stable command entrypoints. Large skill-specific maintainer implementations live under `scripts/validation/<area>/`, shared validation modules live under `scripts/validation/lib/`, and installable runtime helpers remain inside their owning skill directory. This preserves the runtime-payload separation defined by [ADR-0007](adrs/0007-keep-skill-evals-outside-runtime-payload.short.md) ([Long, canonical](adrs/0007-keep-skill-evals-outside-runtime-payload.long.md) · [Guide](adrs/0007-keep-skill-evals-outside-runtime-payload.guide.md)).

## Continuous Integration

The `Validate` workflow runs on pushes to `main`, pull requests, and manual dispatch. It runs `npm run validate`, `pnpm format:check`, `pnpm lint`, `npx skills@latest add ./skills --list`, and `npm run smoke:install`. `npm run validate` includes actionlint for GitHub Actions workflows and the Astro site build. On pull requests, it also runs release validation when release intent is detected so partial package, changelog, or public skill version updates fail before merge.

The `GitHub Pages` workflow builds `site/` on pull requests without deploying. Pushes to `main` and manual dispatches from `main` upload the static `site/dist` artifact and deploy through GitHub Pages Actions.

`Publish Release` runs only through manual dispatch. Keep `dry_run` set to `true` for a final readiness check, then rerun with `dry_run` set to `false` only after maintainer approval.

Warnings are not always blockers, but new warnings should be reviewed before publishing.
