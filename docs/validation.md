# Validation

Validation keeps the promoted public skill catalog and incubator candidates compatible with the open Agent Skills specification, repository ADR-triplet contract, and skill-specific runtime contracts.

## Commands

List public skills:

```bash
pnpm run list
```

List incubator skills:

```bash
pnpm run list:incubator
```

Validate skills:

```bash
pnpm run validate
```

Validate only skills:

```bash
pnpm run validate:skills
```

Validate the shared Claude, Codex, and Cursor memory-curator workflow contract:

```bash
pnpm run validate:memory-curators
```

This focused gate verifies the same eight canonical routes in the same order, intent-bound routing, chat/file persistence boundaries, direct-cleanup limits, Plan-mode lifecycle, backup safety, and repeatable exact-path `--include` fixtures.

Validate only ADRs:

```bash
pnpm run validate:adrs
```

Validate the advisory runtime evidence matrix and its command/toolchain alignment:

```bash
pnpm run validate:runtime-matrix
```

The matrix records one selected candidate per current execution boundary. Its
`unknown` and `not-applicable` signals remain advisory; malformed declarations,
missing boundaries, command drift, undocumented fallbacks, and actual command or
mandatory gate failures remain strict errors.

The focused validation plan is recorded in
[`docs/validation-ownership.json`](validation-ownership.json). Each mandatory
gate has one owning boundary, one proof description, and an explicit cadence.
`pnpm run validate:ownership` checks that the register is complete and that each
listed pnpm command and owner exists. The hosted `Validate` aggregate remains a
required repository gate; focused checks below retain ownership of their
specific contract and are not replaced by the aggregate.

Validate the ownership plan:

```bash
pnpm run validate:ownership
```

Validate bundle membership and its fixture failures:

```bash
pnpm run validate:bundles
```

Validate the OpenAI listing and repository-local marketplace:

```bash
pnpm run validate:openai
```

Validate release identity, pinned contract snapshots, and requirement traceability:

```bash
pnpm run validate:release-descriptor
pnpm run validate:contract-snapshots
pnpm run validate:traceability
pnpm run verify:supply-chain
```

`validate:release-descriptor` checks `plugins/stark-ai-developer.source.json`
against its colocated schema and the Node/Bun/pnpm pins. `validate:contract-snapshots`
checks the dated snapshots selected by that source file. `validate:traceability` fails when
`docs/listing/openai/requirement-traceability.json` is stale.
`verify:supply-chain` inventories bundled licenses and lockfile packages; signed
release-tag provenance remains a publication gate.

Synchronize/check and validate the committed portable projection:

```bash
pnpm run sync:agent-plugin
pnpm run validate:projections
```

Edit bundled skills only under `skills/<category>/<skill>/`. Do not hand-edit
`plugins/stark-ai-developer/`. After changing a bundled skill or
`plugins/stark-ai-developer.source.json`, run `pnpm run sync:agent-plugin`.
`validate:projections` includes `sync-agent-plugin --check` and fails on drift.
The same command also regenerates `.agents/plugins/marketplace.json` from
`plugins/stark-ai-developer.source.json` and fails `--check` when that file drifts.

Generate and validate the ephemeral OpenAI adapter independently:

```bash
pnpm run validate:openai-plugin
```

Build and inspect release archives, including standalone skill archives:

```bash
pnpm run validate:archives
pnpm run verify:release-reproducibility
pnpm run generate:release-evidence
pnpm run validate:network-endpoints
pnpm run validate:release-proof
```

`validate:archives`, `validate:openai-plugin`, `validate:network-endpoints`,
and `verify:release-reproducibility` use disposable temporary directories and
do not rewrite committed repository artifacts. OpenAI adapter packaging stages
a native `.codex-plugin` tree only long enough to validate and archive it.
Archives use the `zip-store-v1` STORE-only profile. Isolated OpenAI-adapter
marketplace fixtures are generated with `pnpm run generate:openai-marketplace-fixture`
and must not rewrite `.agents/plugins/marketplace.json`.
`generate:release-evidence` is the explicit mutating command; it refreshes the
tracked release-evidence JSON with the source commit/tag, explicit clean/dirty
source state, a deterministic release-input tree digest, manifest hashes,
archive inventories, and the two-build reproducibility result. A dirty source
state is evidence about the exact input tree, not a claim that `HEAD` alone
recreates the build.
The endpoint scan permits only the W3C namespace URLs and the draw.io endpoints
documented by the draw.io skill; new executable endpoints fail the gate.

The OpenAI submission worksheet is generated from the listing contract and is
checked for drift by `pnpm run validate:openai` (or directly with
`pnpm run validate:openai-worksheet`). Portal and product-surface observations
after first publication live in
[`docs/listing/openai/stark-ai-developer-first-publication.md`](listing/openai/stark-ai-developer-first-publication.md)
and are not inferred from freeze evidence or the worksheet.

Validate the routed Architecture Compass ADR library and its eval contract:

```bash
pnpm run validate:architecture-compass
```

This gate verifies the complete 58-record Short/Long/Guide inventory, shared metadata and navigation, scope/adoption rules, accepted decision locks, catalog routing, the exhaustive repo-only decision-lineage disposition manifest, the separately validated internal implementation namespace whose shipped records use Accepted or Superseded status, immutable decision locks, reciprocal successor metadata, and exclusion from public catalog/adoption routing, the five public workflows and intent-bound selector, derived assets, retired legacy references, and required lifecycle/eval cases. The install smoke requires the exact AC-ADR-001 through AC-ADR-058 inventory plus the seven internal reference files, checks each shipped internal record has an allowed historical status, compares each installed payload with the clean-copy source payload, and rejects leaked copies of the repo-only lineage and historical-reference evidence by filename or exact content hash.

Validate script syntax:

```bash
pnpm run validate:scripts
```

Validate the CodeGraph + ast-grep runtime contract and captured behavior:

```bash
pnpm run validate:codegraph-ast-grep
```

This dedicated gate is offline and deterministic. It statically checks the
installed skill contract and scenario catalog, verifies the current v0.3.3
local-refresh source/prompt/output/grading/provenance hashes and 5/35/0
result, regrades the historical v0.2 assertions from committed final responses,
and reconciles all totals. Running the gate does not invoke a reviewer, query the
network, or execute CodeGraph/ast-grep.

Validate Draw.io source, export, and intent-routing fixtures:

```bash
pnpm run validate:drawio
```

Validate Animated README Logo runtime, delivery, and eval contracts:

```bash
pnpm run validate:animated-readme-logo
```

Validate SkillOpt setup helper contracts when changing that incubator skill:

```bash
pnpm run validate:skillopt
```

This focused gate is not part of `pnpm run validate`.

Build the GitHub Pages catalog:

```bash
pnpm --filter ./site run build
```

Check local public install discovery:

```bash
pnpm dlx skills@1.5.23 add ./skills --list
```

Run the clean-copy public install smoke test:

```bash
pnpm run smoke:fingerprint
pnpm run smoke:install
```

Oxc and workflow checks:

```bash
pnpm install
pnpm run format:check
pnpm run lint
pnpm run lint:actions
```

`pnpm run lint:actions` prefers an official `actionlint` binary when one is available on `PATH`, then falls back to the pinned `github-actionlint` dev dependency installed by `pnpm install`. Cursor and VS Code users should install the recommended `jimeh.actionlint` extension; the workspace settings point it at `node_modules/.bin/github-actionlint` for immediate inline diagnostics after dependency install.

Validate release readiness:

```bash
pnpm run release:manage -- impact --kind minor --skill architecture-compass
pnpm run release:intent -- --base-ref origin/main
pnpm run release:validate -- --base-ref origin/main
```

## What Validation Checks

- `skills/**/SKILL.md` exists for promoted public skills.
- `incubator/skills/**/SKILL.md` is validated when incubator candidates exist.
- Frontmatter starts the file.
- Frontmatter parses as YAML, and `metadata.category` matches the path when present.
- `agents/openai.yaml` parses as YAML with supported `interface` and `policy` fields, optional `dependencies.tools`, representable `products`, Boolean `allow_implicit_invocation`, and valid skill-local icon paths; resolved default prompts use current-host controls.
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
- Oxc formatting and script linting pass through `pnpm run format:check` and `pnpm run lint`.
- GitHub Actions workflows pass `actionlint` through `pnpm run lint:actions`.
- The Astro GitHub Pages catalog builds generated public and incubator skill routes from `SKILL.md`.
- README and publishing host-ready install sets include every portable public skill for Codex, Cursor, and Claude Code.
- Known upstream helper skills are not vendored under `skills/`; they belong in local ignored `.agents/skills/` installs.
- Repository ADRs form complete Short/Long/Guide triplets with stable IDs, accepted stem/decision locks, synchronized metadata, Long canonical authority, exact sibling navigation, reciprocal supersession, valid catalog routing, and no unsuffixed legacy paths or links.
- Multi-workflow skills keep finite disclosure, clear-intent routing, ambiguity, and mutation-authority checks in their focused validators and eval inventories. Repo-only manifests are used only where an owning validator needs deterministic lineage, source-lock, or evidence identity; they do not become runtime policy.
- Memory-curator validation checks the shared eight-route ordering, recommended route, routing defaults, persistence records, Plan lifecycle, cleanup boundaries, exact-include no-clobber backups, and source-to-copy manifest integrity across Claude, Codex, and Cursor.
- Architecture Compass validation checks its 58 routed ADR triplets, five-workflow dispatcher, preserved AC-ADR-002 to AC-ADR-026 to AC-ADR-043 to AC-ADR-045 to AC-ADR-048 workflow history, AC-ADR-042 to AC-ADR-047 to AC-ADR-049 validation-policy succession, independent AC-ADR-046 evidence ranking, AC-ADR-050 semantic receipt markers, AC-ADR-051 public/internal namespace routing, AC-ADR-052 host-neutral persistence surfaces, AC-ADR-053 capability-aware presentation profiles, AC-ADR-054 external agent-worktree isolation, AC-ADR-055 generated-release separation plus the AC-ADR-056 and AC-ADR-057 recovery refinements, and AC-ADR-058 pnpm ownership with Bun-first verified execution, complete decision-lineage dispositions, byte-locked legacy-reference coverage outside the runtime payload, AC-ADR-004-aligned receipt assets, derived non-normative assets, locked and reciprocally superseded internal-triplet integrity, and maintainer eval inventory.
- `smoke:fingerprint` and `smoke:install` share one Git-derived candidate-selection and safe-read pipeline containing only existing indexed files and non-ignored untracked files, with local/private/generated state excluded. Every repository-relative path component is checked with `lstat`, parent and leaf symlinks are rejected, and open file descriptors are identity-checked before and after reading. The deterministic SHA-256 binds the sorted relative path, normalized permission mode, byte size, and content hash of every candidate. `smoke:install` emits that same fingerprint, publishes its destination only after the complete staged copy succeeds, requires the CLI list to equal the public `skills/` catalog exactly, and then performs disposable project-local Codex, Cursor, and Claude Code installs with exact destination assertions, Architecture Compass payload parity, and telemetry disabled.
- Release-impact detection separates feature PRs from generated release PRs. Feature PRs raise every changed skill version and the bundled plugin version without changing root release files. A generated release PR synchronizes `.release-please-manifest.json`, `package.json`, and one Changelog release section and changes no other files. Historical `## vX.Y.Z - date` and new Release Please headings are both accepted; historical sections and `## Unreleased` remain unchanged in the generated PR.
- Release validation checks the relevant contract, all current public skill semvers, Manifest/Root/Changelog synchronization for generated releases, and the exact three-file generated-PR boundary before a tag can be reconciled.
- Script syntax validation checks repository Node scripts and skill shell scripts.
- CodeGraph + ast-grep contract validation checks the installed-payload allowlist, plain benefit-first `setup`/`update`/`doctor` routing, agent guidance, update/migration and doctor safety invariants, fenced Markdown/config command snippets and scanner fixtures, historical captured behavioral hashes, and the separately labeled hash-bound v0.3.3 local nonbehavioral refresh reusing the internal collaboration-reviewer capture with independent 35/35 grading. Internal reviewer evidence is not CI, hosted, production, or live-tool proof.
- Draw.io validation checks source structure, export/runtime boundaries, and clear-intent, ambiguity, and agent-authority routing cases.
- Animated README Logo validation checks the `audit`/`create`/`transform`/`animate` contract, required motion/delivery artifacts, provider and tooling gates, runtime fixtures, and deterministic eval assertions.
- SkillOpt setup validation (`pnpm run validate:skillopt`, not in the local aggregate) checks helper `--help` contracts, adapter template syntax, mode config contracts, benchmark hard-assertion coverage, and accidental private payload leakage.
- Plugin-source validation treats `plugins/stark-ai-developer.source.schema.json` as the authoritative closed input schema, checks the exact six-skill Codex allowlist, normalized source boundaries, README command tokens, routing declarations, and category-inference rejection.
- Projection validation checks the committed portable Agent Plugins schema, generated root shape, byte-identical canonical skill trees, symlink/special-file rejection, and deterministic source manifests. OpenAI-native adapter and archive proof is independent: `validate:openai-plugin` stages a `.codex-plugin` tree only long enough to validate it, and `validate:archives` plus `verify:release-reproducibility` prove the skills-only ZIP, standalone skill archives, and two-build `zip-store-v1` checksums. Those adapter and archive checks are not part of the local `pnpm run validate` aggregate.
- Listing and marketplace validation checks metadata limits, safe HTTPS URLs, asset dimensions, brand-color contrast, routing fidelity, local `./` source paths, no-auth marketplace semantics, and explicit non-public terminology.

Repository CLIs live under domain folders: `scripts/catalog/` (skills, ADRs, scaffolding), `scripts/plugin/` (projections, listing, OpenAI, evals), `scripts/release/` (versioning, archives, post-release), and `scripts/repo/` (lint, smoke, script syntax, traceability). Shared modules stay in `scripts/lib/`. Pinned schemas stay in `scripts/vendor/`. Skill-specific maintainer implementations and their tests live under `scripts/validation/<area>/`, shared validation helpers under `scripts/validation/lib/`, and installable runtime helpers remain inside their owning skill directory. Prefer `pnpm run` names over raw paths. This preserves the runtime-payload separation defined by [ADR-0007](adrs/0007-keep-skill-evals-outside-runtime-payload.short.md) ([Long, canonical](adrs/0007-keep-skill-evals-outside-runtime-payload.long.md) · [Guide](adrs/0007-keep-skill-evals-outside-runtime-payload.guide.md)).

## Continuous Integration

The `Validate` workflow runs on pushes to `main`, pull requests, and manual dispatch. Checkout is shallow; pull requests fetch only the base commit needed for release-impact diffs. It runs `pnpm run validate`, then `pnpm run validate:archives` and the shared reproducibility script through `.github/actions/build-release-subjects`; on a successful `main` push it uploads `openai.zip`, `portable.zip`, and `release-subject.json` as three direct, byte-preserved artifacts for `Publish Release`. It then runs `pnpm run format:check`, `pnpm run lint`, `pnpm dlx skills@1.5.23 add ./skills --list`, and `pnpm run smoke:install`. A separate `archive-identity` matrix pins Git to LF checkouts (`core.autocrlf=false`), packages `zip-store-v1` archives on Linux, macOS, and Windows, and compares SHA-256 values. Repository `.gitattributes` also sets `* text=auto eol=lf` so Windows working trees match Git blobs. `pnpm run validate` includes actionlint for GitHub Actions workflows, the Astro site build, `validate:network-endpoints`, release-descriptor, contract-snapshot, traceability, and supply-chain gates. The live ChatGPT directory fetch is part of neither the local aggregate nor hosted `Validate`. Publish does not rerun local release packaging. OpenAI adapter generation is not part of the local aggregate. On pull requests, the impact contract rejects missing component bumps and partial or over-broad generated release PRs.

`pnpm run smoke:fingerprint` reads the current worktree projection of `git ls-files --cached --others --exclude-standard` without creating a copy or changing repository state. Run it immediately before and after broader gates when a receipt must bind those gates to exact candidate bytes; both invocations must report the same digest. `pnpm run smoke:install` uses the identical projection and emits the fingerprint of the bytes it actually copied. Indexed paths missing from the worktree are skipped, while ignored private paths and dependency/build/temp roots are explicitly denied. The focused contract test in `pnpm run validate:scripts` proves digest stability independent of creation order; digest changes for content, path, permission-mode, and candidate-set changes; copy/fingerprint equality; ignored-path exclusion; read-only repository behavior; parent/leaf symlink rejection before any destination appears; and exact CLI skill-set enforcement. A network-restricted local validation may set `SKILLS_SMOKE_CLI=/absolute/path/to/a-preinstalled-skills-cli` to exercise the same discovery and installation assertions without fetching executable code; the override must resolve to an existing regular executable file. `SKILLS_SMOKE_FORCE_TTY`, when configured, accepts only `0` or `1`. Older trusted CLIs that suppress captured output may set it to `1`; this requires the explicit CLI path and the local `script` utility. Both overrides are validated before a temporary directory is created, and every later failure unwinds through the temporary-copy cleanup. Record the candidate digest, CLI version, and both overrides in the validation receipt; CI and release gates leave the overrides unset.

The required `Validate` workflow already builds `site/` on pull requests through `pnpm run validate`. The `GitHub Pages` workflow therefore runs only for relevant pushes to `main` (or an explicit manual dispatch); main-branch runs upload the static `site/dist` artifact and deploy through GitHub Pages Actions.

The dedicated `ChatGPT Directory Identity` workflow runs the strict
`.github/actions/verify-openai-directory` action after publication on a daily
schedule or manual dispatch. It is intentionally separate from deterministic
hosted `Validate` and does not package an OpenAI zip. Local fallback is
`pnpm run verify:openai-directory`. The script covers directory-document identity
(`DIR-001`) and public category-catalog membership (`DIR-002`).

`Publish Release` starts automatically when a generated release PR changes `.release-please-manifest.json` on `main`; manual `dry_run` dispatch remains available. Readiness is read-only and waits for successful hosted `Validate` on the same SHA. The write-capable job targets `environment: release`, waits for maintainer approval, and verifies the environment policy before any API mutation. Job summaries name the next operator follow-up in `docs/publishing.md`.
