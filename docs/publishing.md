# Publishing

This repository is published by pushing it to a public GitHub repository. There is no separate registry publish step.

## Public Repository

The public repository is expected to be:

```text
stark-ai-de/agent-skills
```

Recommended GitHub description:

```text
Public Agent Skills for Codex operations, Cursor operations, Claude operations, repo maintenance, skill maintenance, productivity, and engineering workflows.
```

Recommended GitHub topics:

```text
skills
agent-skills
codex
cursor
openai-codex
claude-code
anthropic-claude
ai-agents
repository-maintenance
developer-tools
workflow-automation
pr-review
release-management
adr
```

Use:

```bash
npx skills@latest add stark-ai-de/agent-skills --list
npx skills@latest add stark-ai-de/agent-skills --skill codex-memory-curator codex-spec-interviewer animated-readme-logo architecture-compass codegraph-ast-grep drawio-diagrams -g -a codex -y
npx skills@latest add stark-ai-de/agent-skills --skill cursor-memory-curator cursor-spec-interviewer animated-readme-logo architecture-compass codegraph-ast-grep drawio-diagrams -g -a cursor -y
npx skills@latest add stark-ai-de/agent-skills --skill claude-memory-curator claude-spec-interviewer animated-readme-logo architecture-compass codegraph-ast-grep drawio-diagrams -g -a claude-code -y
npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill codex-spec-interviewer -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill codex-memory-curator -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill architecture-compass -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill architecture-compass -g -a cursor
npx skills@latest add stark-ai-de/agent-skills --skill drawio-diagrams -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill drawio-diagrams -g -a cursor
npx skills@latest add stark-ai-de/agent-skills --skill drawio-diagrams -g -a claude-code
npx skills@latest add stark-ai-de/agent-skills --skill animated-readme-logo -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill animated-readme-logo -g -a cursor
```

The Codex release bundle is an explicit, ordered allowlist in [`plugins/stark-ai-developer.source.json`](../plugins/stark-ai-developer.source.json); category membership and directory discovery do not add skills implicitly. The standalone commands above remain individually scoped so runtime-specific skills are never selected by inference.

Install Claude Code public skills project-locally or globally with the skills CLI:

```bash
npx skills@latest add stark-ai-de/agent-skills --skill claude-memory-curator claude-spec-interviewer animated-readme-logo architecture-compass codegraph-ast-grep drawio-diagrams -a claude-code -y
npx skills@latest add stark-ai-de/agent-skills --skill claude-memory-curator claude-spec-interviewer animated-readme-logo architecture-compass codegraph-ast-grep drawio-diagrams -g -a claude-code -y
```

Avoid `--skill '*'` scoped to one runtime: the wildcard also selects runtime-specific skills for the other runtime, such as `cursor-spec-interviewer` and `claude-spec-interviewer` for Codex.

The `-a` option selects the installation host, not the skill's target runtime. An intentionally cross-host install preserves the target-specific evidence and output contract while adapting collaboration controls to the selected host.

`--list` is a discovery check only. It does not install skills and should not be treated as a skills.sh indexing trigger. skills.sh ranks and discovers repository pages from anonymous successful-install telemetry when telemetry is enabled. A root `skills.sh.json` customizes display after the repository has been seen by that service.

## Local Smoke Test

From the repository root:

```bash
npm run validate
npm run list
npx skills@latest add ./skills --list
npm run smoke:fingerprint
npm run smoke:install
```

`npm run smoke:fingerprint` reads the exact candidate set without copying or changing repository state. Its deterministic SHA-256 binds each sorted repository-relative path, normalized permission mode, byte size, and content hash. Run it immediately before and after the broader gates used by a validation receipt and require an exact match.

`npm run smoke:install` creates a temporary candidate copy from existing Git-indexed files plus non-ignored untracked files through the same selection and safe-read pipeline. Before copying, it checks every repository-relative path component with `lstat`, rejects parent or leaf symlinks, identity-checks each open file before and after reading, and stages regular files transactionally so a rejected candidate exposes neither external bytes nor a partial destination. It emits the fingerprint of the bytes it actually copied. It excludes `.git/`, local agent state, private `docs/specs/do-not-publish/` content, lock state, dependencies, and generated build or temporary directories even if such a path is indexed. It requires the CLI's `Available Skills` output to equal the public `skills/` catalog exactly, then performs disposable project-local Codex, Cursor, and Claude Code installs and asserts their exact destinations before removing only its own temporary tree. Telemetry is disabled and no global skills are installed.

Do not publish, push, tag, send telemetry-triggering installs, or install globally unless the maintainer explicitly asks for that action.

Test the changed public skill locally after approval:

```bash
npx skills@latest add ./skills --skill codegraph-ast-grep -a codex --copy -y
```

## Repository Settings

Keep the repository public before claiming public install readiness. Keep default workflow permissions read-only and grant write permissions only on the release jobs that need them.

Expected settings:

- default branch: `main`
- delete branch on merge: enabled
- wiki: disabled
- issues: enabled
- workflow default permissions: read
- `main` ruleset: require PRs, require `validate`, require resolved review threads, block deletion, and block force pushes

Do not change GitHub settings, publish releases, push tags, or install globally unless the maintainer explicitly asks for that action.

## First Public Release Checklist

- README has the public catalog boundary.
- README explains the incubator and skill-eval roots.
- LICENSE exists.
- SECURITY.md exists.
- CONTRIBUTING.md exists.
- CHANGELOG.md exists.
- AGENTS.md exists.
- `docs/adrs/` exists with initial ADRs.
- Every public and incubator skill has `SKILL.md`.
- Every public and incubator skill name matches its folder name.
- Every public and incubator skill follows agentskills.io naming constraints.
- Every description explains what the skill does and when to use it.
- No private names, URLs, secrets, or customer details are present.
- No destructive scripts are present.
- Published upstream skills are not vendored under `skills/`.
- Incubator skills use `metadata.internal: true` and are not discoverable through the public install path by default.
- Project-local helper skills under `.agents/skills/` and local `skills-lock.json` files are ignored.
- Category README files exist and match `SKILL.md` frontmatter.
- Clean-copy smoke install passes without listing project-local helper skills.
- `npm run validate` passes.
- `npx skills@latest add ./skills --list` works from the local checkout.
- At least one promoted skill can be locally installed after maintainer approval.
- GitHub Actions validation and publish release workflows are configured.

## Release Process

Releases are prepared in the same pull request that changes the public catalog, then published manually from `main`.

### Prepare In The Change PR

Public skill versions are independent from the repository package version:

- New promoted skills may start at `metadata.version: "0.1.0"`.
- Changed promoted skills must increase their own `metadata.version`.
- Unchanged promoted skills keep their existing `metadata.version`.
- The repository `package.json` version represents the public catalog release and must increase when public skills are added, removed, or their own versions increase.

Use the local helper when preparing the package and changelog release files:

```bash
NEXT_VERSION=0.2.1
node scripts/prepare-release.mjs --version "$NEXT_VERSION" --dry-run
node scripts/prepare-release.mjs --version "$NEXT_VERSION"
```

The helper updates only `package.json` and `CHANGELOG.md`. Bump changed public skill `metadata.version` values directly in the same PR.

The changelog section a pull request adds is the currently planned catalog release compared with the previous release, not a diary of intermediate PR states:

- Keep historical `## vX.Y.Z` sections unchanged.
- Describe the current tree versus the previous release (the base branch's package version).
- Do not record paths or layouts that were added and then removed inside the same PR.
- Keep in-progress notes in `## Unreleased` until the package version is bumped; then fold those notes into `## v<package-version>` so GitHub Release notes match the planned tag.
- After that fold, `## Unreleased` stays as empty headings. It is the next release, not this one.

Validate the release contract locally:

```bash
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --base-ref origin/main
```

### Publish Release

After the change PR is merged, run the `Publish Release` workflow manually with `dry_run: true` for a final release-readiness check.

The workflow reads the release version from `package.json`, records the exact `main` commit, waits for a successful hosted `Validate` run for that SHA (or reuses one that already completed), runs release-specific invariants, and prints the version it would release. With `dry_run: false`, the publish job reuses that readiness proof, checks out and tags the exact commit, and fails closed if `main` advanced after readiness. It then creates the annotated tag and GitHub Release without rerunning the aggregate validation suite.

Release intent means a pull request changed `package.json` version, added a `CHANGELOG.md` release heading, or changed public skill files. Pull request validation runs release validation for release-intent changes so partial release preparation fails before merge.

Use manual dispatch with `dry_run: true` if you want to rerun the same readiness check. Use `dry_run: false` only after maintainer approval.

Equivalent local release validation:

```bash
node scripts/validate-release.mjs
node scripts/print-release-notes.mjs
```

## Release Artifacts

The repository keeps canonical skills and the existing `npx skills` installation
path. Plugin projections and optional standalone archives are generated from the
explicit bundle with the following focused commands:

```bash
npm run validate:projections
npm run validate:openai-plugin
npm run validate:release-descriptor
npm run package:openai-plugin
npm run validate:archives
npm run verify:release-reproducibility
npm run verify:supply-chain
npm run generate:release-evidence
```

`plugins/stark-ai-developer/` is the portable Agent Plugins projection.
`npm run sync:openai-plugin` does not write a repository adapter tree.
`dist/openai/stark-ai-developer-1.0.0.zip` is the OpenAI-native skills-only
submission archive, generated from ephemeral adapter staging at package time.
Canonical `agents/openai.yaml` is copied unchanged from each bundled skill into
that archive; the adapter does not generate or overlay skill-local metadata.
`dist/skills/*.zip` contains one skill root per optional standalone archive.
These artifacts do not replace canonical sources or prove public-directory
publication. GitHub Releases also provide source archives for each tag, and
normal standalone installation uses the skills CLI:

`npm run generate:release-evidence` is the explicit release-preparation command.
It refreshes
[`docs/listing/openai/stark-ai-developer-release-evidence.json`](listing/openai/stark-ai-developer-release-evidence.json)
with the source commit/tag, projection and manifest hashes, complete archive
inventories, the clean/dirty source state, and a deterministic release-input
tree digest. Portal-normalized manifests, draft
IDs, approval, publication, and client lifecycle observations remain separate
external evidence and are never inferred from this file.

The committed repository-local catalog is
[`.agents/plugins/marketplace.json`](../.agents/plugins/marketplace.json),
generated from `plugins/stark-ai-developer.source.json` by `npm run sync:agent-plugin`.
Its source path is resolved from the repository root and points to the portable
projection. The skills-only entry uses
`policy.installation: "AVAILABLE"` and omits `policy.authentication`: current
marketplace clients support `ON_INSTALL` and `ON_USE` authentication triggers,
and omission is the compatible no-auth representation. Do not copy this file
into a personal marketplace without separately testing the client and path
root.

```bash
npx skills@latest add stark-ai-de/agent-skills --list
npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill codex-spec-interviewer -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill codex-memory-curator -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill architecture-compass -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill drawio-diagrams -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill animated-readme-logo -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill cursor-spec-interviewer -a cursor --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill cursor-memory-curator -a cursor --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill architecture-compass -a cursor --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep -a cursor --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill drawio-diagrams -a cursor --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill animated-readme-logo -a cursor --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill claude-spec-interviewer -a claude-code --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill claude-memory-curator -a claude-code --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill architecture-compass -a claude-code --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep -a claude-code --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill drawio-diagrams -a claude-code --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill animated-readme-logo -a claude-code --copy -y
```

For Claude Code release artifacts, verify the source archive includes the two named Claude-operation skills and the explicitly named engineering-workflow skills used by the commands above; do not infer membership from a directory listing. Then verify installation with the `-a claude-code` commands above.

## Release Update Process

1. Update public or incubator skills.
2. Run `npm run smoke:fingerprint` and record the initial candidate digest before any broader local gate.
3. Run `npm run validate`.
4. Run `pnpm format:check` and `pnpm lint`.
5. Run `npx skills@latest add ./skills --list` locally.
6. Run `npm run smoke:install` and require its emitted digest to match the initial fingerprint.
7. Run `npm run smoke:fingerprint` again after the last local gate and require the digest to remain unchanged.
8. For public catalog changes, bump changed skill versions, bump `package.json`, and add the matching `CHANGELOG.md` release section in the same PR. That section is the planned release compared with the previous one; do not rewrite historical changelog entries.
9. Add an ADR only if a decision changed.
10. Confirm the release-intent PR gate passed.
11. Merge changes through a PR.
12. Run `Publish Release` manually with `dry_run: true`.
13. Run `Publish Release` manually with `dry_run: false`.
14. Verify public install.
