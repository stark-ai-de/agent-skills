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
npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep codex-spec-interviewer codex-memory-curator architecture-compass drawio-diagrams -g -a codex -y
npx skills@latest add stark-ai-de/agent-skills --skill cursor-spec-interviewer cursor-memory-curator codegraph-ast-grep -g -a cursor -y
npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill codex-spec-interviewer -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill codex-memory-curator -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill architecture-compass -g -a codex
npx skills@latest add stark-ai-de/agent-skills --skill drawio-diagrams -g -a codex
```

Install Claude Code public skills from a repository clone into project-local or user-level Claude skills:

```bash
mkdir -p .claude/skills
cp -R skills/claude-operations/claude-spec-interviewer .claude/skills/
cp -R skills/claude-operations/claude-memory-curator .claude/skills/

mkdir -p ~/.claude/skills
cp -R skills/claude-operations/claude-spec-interviewer ~/.claude/skills/
cp -R skills/claude-operations/claude-memory-curator ~/.claude/skills/
```

Avoid `--skill '*'` scoped to one runtime: the wildcard also selects runtime-specific skills for the other runtime, such as `cursor-spec-interviewer` and `claude-spec-interviewer` for Codex.

`--list` is a discovery check only. It does not install skills and should not be treated as a skills.sh indexing trigger. skills.sh ranks and discovers repository pages from anonymous successful-install telemetry when telemetry is enabled. A root `skills.sh.json` customizes display after the repository has been seen by that service.

## Local Smoke Test

From the repository root:

```bash
npm run validate
npm run list
npx skills@latest add ./skills --list
npm run smoke:install
```

`npm run smoke:install` creates a temporary clean copy of the repo, excludes `.agents/`, `.codegraph/`, and `skills-lock.json`, runs `npx skills@latest add . --list`, verifies every public skill is listed when present, verifies incubator skills are not listed, and removes the temporary copy. It does not install global skills.

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

Validate the release contract locally:

```bash
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --base-ref origin/main
```

### Publish Release

After the change PR is merged, run the `Publish Release` workflow manually with `dry_run: true` for a final release-readiness check.

The workflow reads the release version from `package.json`. It validates the repo, checks release invariants, and prints the version it would release. It creates an annotated tag and GitHub Release only when manually dispatched with `dry_run: false`.

Release intent means a pull request changed `package.json` version, added a `CHANGELOG.md` release heading, or changed public skill files. Pull request validation runs release validation for release-intent changes so partial release preparation fails before merge.

Use manual dispatch with `dry_run: true` if you want to rerun the same readiness check. Use `dry_run: false` only after maintainer approval.

Equivalent local release validation:

```bash
node scripts/validate-release.mjs
node scripts/print-release-notes.mjs
```

## Release Artifacts

Do not generate custom per-skill zip files in v1. GitHub Releases provide source archives for each tag, and normal installation uses the skills CLI:

```bash
npx skills@latest add stark-ai-de/agent-skills --list
npx skills@latest add stark-ai-de/agent-skills --skill codegraph-ast-grep -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill codex-spec-interviewer -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill codex-memory-curator -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill architecture-compass -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill drawio-diagrams -a codex --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill cursor-spec-interviewer -a cursor --copy -y
npx skills@latest add stark-ai-de/agent-skills --skill cursor-memory-curator -a cursor --copy -y
```

For Claude Code release artifacts, verify the source archive includes `skills/claude-operations/claude-spec-interviewer` and `skills/claude-operations/claude-memory-curator`, then use the manual copy commands above from a tag checkout.

## Release Update Process

1. Update public or incubator skills.
2. Run `npm run validate`.
3. Run `pnpm format:check` and `pnpm lint`.
4. Run `npx skills@latest add ./skills --list` locally.
5. Run `npm run smoke:install`.
6. For public catalog changes, bump changed skill versions, bump `package.json`, and add the matching `CHANGELOG.md` release section in the same PR.
7. Add an ADR only if a decision changed.
8. Confirm the release-intent PR gate passed.
9. Merge changes through a PR.
10. Run `Publish Release` manually with `dry_run: true`.
11. Run `Publish Release` manually with `dry_run: false`.
12. Verify public install.
