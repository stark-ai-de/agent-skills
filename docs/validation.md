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

Validate the shared Claude, Codex, and Cursor memory-curator workflow contract:

```bash
npm run validate:memory-curators
```

This focused gate verifies the same eight canonical routes in the same order, intent-bound routing, chat/file persistence boundaries, direct-cleanup limits, Plan-mode lifecycle, backup safety, and repeatable exact-path `--include` fixtures.

Validate only ADRs:

```bash
npm run validate:adrs
```

Validate the routed Architecture Compass ADR library and its eval contract:

```bash
npm run validate:architecture-compass
```

This gate verifies the complete 53-record Short/Long/Guide inventory, shared metadata and navigation, scope/adoption rules, accepted decision locks, catalog routing, the exhaustive repo-only decision-lineage disposition manifest, the separately validated internal implementation namespace whose shipped records use Accepted or Superseded status, immutable decision locks, reciprocal successor metadata, and exclusion from public catalog/adoption routing, the five public workflows and intent-bound selector, derived assets, retired legacy references, and required lifecycle/eval cases. It also creates disposable temporary fixtures to prove that malformed libraries, lineage mismatches, and incomplete legacy-reference dispositions fail without modifying the repository. The install smoke requires the exact AC-ADR-001 through AC-ADR-053 inventory plus the seven internal reference files, checks each shipped internal record has an allowed historical status, compares each installed payload with the clean-copy source payload, and rejects leaked copies of the repo-only lineage and historical-reference evidence by filename or exact content hash.

Validate script syntax:

```bash
npm run validate:scripts
```

Validate the CodeGraph + ast-grep runtime contract and captured behavior:

```bash
npm run validate:codegraph-ast-grep
```

This dedicated gate is offline and deterministic. It statically checks the
installed skill contract and scenario catalog, verifies the current v0.3.1
internal-reviewer source/prompt/output/grading/provenance hashes and 5/35/0
result, regrades the historical v0.2 assertions from committed final responses,
and reconciles all totals. Running the gate does not invoke a reviewer, query the
network, or execute CodeGraph/ast-grep. Negative lineage tests mutate or remove
only disposable copies under the operating system's temporary directory; they
never write the repository checkout or Git index, and each fixture registers
cleanup in `finally`.

Validate Draw.io source, export, and intent-routing fixtures:

```bash
npm run validate:drawio
```

Validate Animated README Logo runtime, delivery, and eval contracts:

```bash
npm run validate:animated-readme-logo
```

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
npm run smoke:fingerprint
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
NEXT_VERSION=0.15.0
node scripts/prepare-release.mjs --version "$NEXT_VERSION" --dry-run
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --version "$NEXT_VERSION" --base-ref origin/main
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
- Multi-workflow skills keep finite disclosure, clear-intent routing, ambiguity, and mutation-authority checks in their focused validators and eval inventories. Repo-only manifests are used only where an owning validator needs deterministic lineage, source-lock, or evidence identity; they do not become runtime policy.
- Memory-curator validation checks the shared eight-route ordering, recommended route, routing defaults, persistence records, Plan lifecycle, cleanup boundaries, exact-include no-clobber backups, and source-to-copy manifest integrity across Claude, Codex, and Cursor.
- Architecture Compass validation checks its 53 routed ADR triplets, five-workflow dispatcher, preserved AC-ADR-002 to AC-ADR-026 to AC-ADR-043 to AC-ADR-045 to AC-ADR-048 workflow history, AC-ADR-042 to AC-ADR-047 to AC-ADR-049 validation-policy succession, independent AC-ADR-046 evidence ranking, AC-ADR-050 semantic receipt markers, AC-ADR-051 public/internal namespace routing, AC-ADR-052 host-neutral persistence surfaces, AC-ADR-053 capability-aware presentation profiles, complete decision-lineage dispositions, byte-locked legacy-reference coverage outside the runtime payload, AC-ADR-004-aligned receipt assets, derived non-normative assets, locked and reciprocally superseded internal-triplet integrity, and maintainer eval inventory.
- `smoke:fingerprint` and `smoke:install` share one Git-derived candidate-selection and safe-read pipeline containing only existing indexed files and non-ignored untracked files, with local/private/generated state excluded. Every repository-relative path component is checked with `lstat`, parent and leaf symlinks are rejected, and open file descriptors are identity-checked before and after reading. The deterministic SHA-256 binds the sorted relative path, normalized permission mode, byte size, and content hash of every candidate. `smoke:install` emits that same fingerprint, publishes its destination only after the complete staged copy succeeds, requires the CLI list to equal the public `skills/` catalog exactly, and then performs disposable project-local Codex, Cursor, and Claude Code installs with exact destination assertions, Architecture Compass payload parity, and telemetry disabled.
- Release-intent detection checks whether a PR changed `package.json` version, added a `CHANGELOG.md` release heading, or changed public skill files.
- Release validation checks that the repository package version and changelog release section match, public skill `metadata.version` values are semver and do not exceed the package release, changed existing public skills increase their own version, and public skill validation passes before a tag is created.
- Script syntax validation checks repository Node scripts and skill shell scripts.
- CodeGraph + ast-grep contract validation checks the installed-payload allowlist, plain benefit-first `setup`/`update`/`doctor` routing, agent guidance, update/migration and doctor safety invariants, fenced Markdown/config command snippets and scanner fixtures, historical captured behavioral hashes, and the separately labeled hash-bound v0.3.1 internal collaboration-reviewer capture with independent 35/35 grading. Internal reviewer evidence is not CI, hosted, production, or live-tool proof.
- Draw.io validation checks source structure, export/runtime boundaries, and clear-intent, ambiguity, and agent-authority routing cases.
- Animated README Logo validation checks the `audit`/`create`/`transform`/`animate` contract, required motion/delivery artifacts, provider and tooling gates, runtime fixtures, and deterministic eval assertions.
- SkillOpt setup validation checks helper `--help` contracts, adapter template syntax, mode config contracts, benchmark hard-assertion coverage, and accidental private payload leakage.

Root `scripts/validate-*.mjs` files are stable command entrypoints. Large skill-specific maintainer implementations live under `scripts/validation/<area>/`, shared validation modules live under `scripts/validation/lib/`, and installable runtime helpers remain inside their owning skill directory. This preserves the runtime-payload separation defined by [ADR-0007](adrs/0007-keep-skill-evals-outside-runtime-payload.short.md) ([Long, canonical](adrs/0007-keep-skill-evals-outside-runtime-payload.long.md) · [Guide](adrs/0007-keep-skill-evals-outside-runtime-payload.guide.md)).

## Continuous Integration

The `Validate` workflow runs on pushes to `main`, pull requests, and manual dispatch. It runs `npm run validate`, `pnpm format:check`, `pnpm lint`, `npx skills@latest add ./skills --list`, and `npm run smoke:install`. `npm run validate` includes actionlint for GitHub Actions workflows and the Astro site build. On pull requests, it also runs release validation when release intent is detected so partial package, changelog, or public skill version updates fail before merge.

`npm run smoke:fingerprint` reads the current worktree projection of `git ls-files --cached --others --exclude-standard` without creating a copy or changing repository state. Run it immediately before and after broader gates when a receipt must bind those gates to exact candidate bytes; both invocations must report the same digest. `npm run smoke:install` uses the identical projection and emits the fingerprint of the bytes it actually copied. Indexed paths missing from the worktree are skipped, while ignored private paths and dependency/build/temp roots are explicitly denied. The focused contract test in `npm run validate:scripts` proves digest stability independent of creation order; digest changes for content, path, permission-mode, and candidate-set changes; copy/fingerprint equality; ignored-path exclusion; read-only repository behavior; parent/leaf symlink rejection before any destination appears; and exact CLI skill-set enforcement. A network-restricted local validation may set `SKILLS_SMOKE_CLI=/absolute/path/to/a-preinstalled-skills-cli` to exercise the same discovery and installation assertions without fetching executable code; the override must resolve to an existing regular executable file. `SKILLS_SMOKE_FORCE_TTY`, when configured, accepts only `0` or `1`. Older trusted CLIs that suppress captured output may set it to `1`; this requires the explicit CLI path and the local `script` utility. Both overrides are validated before a temporary directory is created, and every later failure unwinds through the temporary-copy cleanup. Record the candidate digest, CLI version, and both overrides in the validation receipt; CI and release gates leave the overrides unset.

The required `Validate` workflow already builds `site/` on pull requests through `npm run validate`. The `GitHub Pages` workflow therefore runs only for relevant pushes to `main` (or an explicit manual dispatch); main-branch runs upload the static `site/dist` artifact and deploy through GitHub Pages Actions.

`Publish Release` runs only through manual dispatch. Keep `dry_run` set to `true` for a final readiness check, then rerun with `dry_run` set to `false` only after maintainer approval.

Warnings are not always blockers, but new warnings should be reviewed before publishing.
