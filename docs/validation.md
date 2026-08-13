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

[ADR-0047](adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.short.md) ([Long, canonical](adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) · [Guide](adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.guide.md)) makes the mutation fixture inventory, expected outcomes, process isolation, sealed baseline, deterministic hosted-shard accounting, and cleanup part of the repository validation contract. On a hosted cache miss, stable ordinals are split modulo three across three jobs and each shard uses up to three local workers. The deterministic local rollback modes remain one worker and forced ordinary copying:

```bash
ARCHITECTURE_FIXTURE_WORKERS=1 npm run validate:architecture-compass
ARCHITECTURE_FIXTURE_FORCE_COPY=1 npm run validate:architecture-compass
```

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
pnpm install
pnpm exec skills add ./skills --list
```

The root dev dependency pins `skills` exactly at `1.5.22`. Hosted validation passes that installed executable to `smoke:install` instead of fetching another CLI copy. A direct local smoke run retains the same exact-version `npx` fallback unless `SKILLS_SMOKE_CLI` is configured.

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

Validate affected planning, the content-addressed task graph, miss execution, and proof contracts:

```bash
npm run validate:ci-contract
```

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
- Architecture Compass fixture coordination checks the frozen stable case inventory and polarity, deterministic three-way hosted assignment, bounded local workers, sealed copy-on-write capsules with ordinary-copy fallback, separate worker processes, complete 325/325 result accounting, inventory and baseline digests, process-group termination, and exact shard-root cleanup. A verified gate hit creates no shard jobs; one worker and ordinary copying remain rollback modes under ADR-0047.
- The CI contract gate checks full-versus-affected planning, NUL-safe rename/deletion inputs, base/candidate union and fail-full fallbacks, task-key determinism and invalidation, exact verified reuse, dynamic miss matrices, timeouts and process termination, tombstones, safe output restoration, validation report schema v2, trusted receipt schema v3, and recursive release-proof rejection cases.
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

[ADR-0046](adrs/0046-assemble-validation-proof-from-content-addressed-task-results.short.md) ([Long, canonical](adrs/0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · [Guide](adrs/0046-assemble-validation-proof-from-content-addressed-task-results.guide.md)) governs hosted validation scope, result reuse, and proof. The unfiltered `Validate` workflow runs for every pull request, every push to `main`, and every manual dispatch, and always creates the same required `validate` aggregator. Main pushes and all manual dispatches select the complete logical manifest gate set. Pull requests select the fail-closed union of compatible plans produced from the exact event base SHA and checked-out candidate; a missing planner, malformed or incompatible plan, full request, unknown gate, unmatched path, or global invalidator selects full validation.

Manifest schema v2 separates affected-selection paths from complete execution inputs. The resolver computes canonical content-addressed task keys from repository, gate and engine contracts; path, type, mode, size, and content witnesses; expanded commands; dependency profiles; prerequisite keys; sanitized environment; exact deterministic package tools; the pinned hosted runner and system-tool compatibility policy; logical Git inputs; evidence; and restorable outputs. Every producer separately observes its exact hosted image and system executable bytes before execution, while those rollout-specific observations do not make otherwise compatible jobs on the same pinned runner label reject one another. Commit SHA, run identity, timestamps, duration, and hosted-image rollout identifiers are excluded. Missing, ambiguous, or unverifiable required identity forces a miss. `validation_reuse` accepts `auto`, `off`, or `verify`: `auto` reuses verified hits, `off` executes every selected gate, and `verify` re-executes would-be hits and requires identical semantic evidence and output digests.

GitHub Actions cache is an untrusted, disposable lookup index only. Immutable attempt-safe task artifacts are authoritative and are downloaded by exact artifact ID after repository, workflow, control-plane, run, attempt, job, conclusion, digest, schema, key, evidence, and prerequisite verification. An absent, expired, or unavailable result executes fresh. Malformed or contradictory proof fails closed. A newer eligible failed execution tombstones an older success, and a current failure never falls back. Only cache misses create gate jobs and install their declared root or site dependency profiles; a complete hit performs neither gate execution nor gate dependency installation.

The always-running aggregator explicitly interprets skipped conditional jobs, rejects missing or unexpected results, verifies the candidate fingerprint before and after validation, restores and independently hashes declared outputs, and writes validation report schema v2. Each gate records `executed` or `reused`, its task and receipt digests, producer identity, lookup time, evidence, and outputs; the report binds the complete result-set digest. An empty dynamic matrix is an explicit full-hit state and never masquerades as an unexamined success.

`npm run smoke:fingerprint` reads the current worktree projection of `git ls-files --cached --others --exclude-standard` without creating a copy or changing repository state. Run it immediately before and after broader gates when a receipt must bind those gates to exact candidate bytes; both invocations must report the same digest. `npm run smoke:install` uses the identical projection and emits the fingerprint of the bytes it actually copied. Indexed paths missing from the worktree are skipped, while ignored private paths and dependency/build/temp roots are explicitly denied. The focused contract test in `npm run validate:scripts` proves digest stability independent of creation order; digest changes for content, path, permission-mode, and candidate-set changes; copy/fingerprint equality; ignored-path exclusion; read-only repository behavior; parent/leaf symlink rejection before any destination appears; and exact CLI skill-set enforcement. A network-restricted local validation may set `SKILLS_SMOKE_CLI=/absolute/path/to/a-preinstalled-skills-cli` to exercise the same discovery and installation assertions without fetching executable code; the override must resolve to an existing regular executable file. `SKILLS_SMOKE_FORCE_TTY`, when configured, accepts only `0` or `1`. Older trusted CLIs that suppress captured output may set it to `1`; this requires the explicit CLI path and the local `script` utility. Both overrides are validated before a temporary directory is created, and every later failure unwinds through the temporary-copy cleanup. Hosted validation configures the exact installed CLI internally and records only its version plus normalized override state; it never serializes the executable path. Release readiness verifies that normalized evidence instead of running the CLI again.

The site task is content-addressed like the other gates and carries a verified `site/dist` output-tree digest. A hit is restored into a private temporary directory, strictly rehashed, and atomically installed. Pull requests never deploy. A successful full protected-main aggregator repackages and rehashes the restored or newly built bytes into a new current-run Pages artifact, issues the current proof, and deploys only after verifying that `refs/heads/main` still equals the run SHA.

Trusted validation receipt schema v3 binds the current candidate and main identity, report and complete result-set digests, every accepted task receipt and producer chain, restorable outputs, current Pages artifact, and all existing plan, manifest, candidate, CLI, and site evidence. Pull-request artifacts are computation evidence, not deployment authority, and are promotable only when their producer control plane exactly matches current protected main. `Publish Release` recursively reverifies every unique producer plus the assembled current-main proof at readiness and publication, recomputes candidate and Pages digests, confirms `main` freshness, and runs dependency-free release metadata validation.

On an Architecture Compass miss, ADR-0047 creates three deterministic hosted shard jobs, each with up to `min(3, max(1, availableParallelism() - 1))` local workers. The aggregate requires the exact frozen 325-case union. A gate hit creates no Architecture Compass process or job. Set `validation_reuse=off` for immediate fresh-execution rollback; bump the namespace or per-gate epoch to invalidate stored results without deleting artifacts.

`Publish Release` runs only through manual dispatch. Keep `dry_run` set to `true` for a final readiness check, then rerun with `dry_run` set to `false` only after maintainer approval.

Warnings are not always blockers, but new warnings should be reviewed before publishing.
