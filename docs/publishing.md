# Publishing

This repository is published by pushing it to a public GitHub repository. There is no separate registry publish step.

## Public Repository

The public repository is expected to be:

```text
stark-ai-de/agent-skills
```

Recommended GitHub description:

```text
Public Agent Skills for Codex operations, repo maintenance, skill maintenance, and agent workflow control.
```

Recommended GitHub topics:

```text
skills
agent-skills
codex
openai-codex
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
npx skills add https://github.com/stark-ai-de/agent-skills --list
npx skills add https://github.com/stark-ai-de/agent-skills --skill codex-spec-interviewer -g -a codex
```

## Local Smoke Test

From the repository root:

```bash
npm run validate
npm run list
npx skills@latest add ./skills --list
npm run smoke:install
```

`npm run smoke:install` creates a temporary clean copy of the repo, excludes `.agents/` and `skills-lock.json`, runs `npx skills@latest add . --list`, verifies every public skill is listed when present, verifies incubator skills are not listed, and removes the temporary copy. It does not install global skills.

Do not publish, push, tag, or install globally unless the maintainer explicitly asks for that action.

Test one local install after approval:

```bash
npx skills add ./skills --skill codex-spec-interviewer -a codex --copy -y
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
- GitHub Actions validation, prepare release, and publish release workflows are configured.

## Release Process

Releases use a manual prepare workflow and a guarded publish workflow so version changes are reviewable before tags exist.

### Prepare Release

Run the `Prepare Release` workflow with:

- `version`: semantic version without a leading `v`
- `release_kind`: `initial`, `patch`, `minor`, or `major`
- `dry_run`: keep `true` until the planned changes look right

The workflow validates the repo, runs `scripts/prepare-release.mjs`, validates again, and opens or updates a `release/v<version>` PR when `dry_run` is `false`.

If GitHub does not run normal PR CI for the generated branch, manually dispatch the `Validate` workflow for the release branch before merging.

Equivalent local dry run:

```bash
node scripts/prepare-release.mjs --version 0.1.0 --dry-run
```

### Publish Release

After the release PR is merged, the `Publish Release` workflow runs automatically on `main` as a dry-run release-readiness check.

The workflow reads the release version from `package.json`. It validates the repo, checks release invariants, and prints the version it would release. It creates an annotated tag and GitHub Release only when manually dispatched with `dry_run: false`.

Use manual dispatch with `dry_run: true` if you want to rerun the same readiness check. Use `dry_run: false` only after maintainer approval.

Equivalent local release validation:

```bash
node scripts/validate-release.mjs
node scripts/print-release-notes.mjs
```

## Release Artifacts

Do not generate custom per-skill zip files in v1. GitHub Releases provide source archives for each tag, and normal installation uses the skills CLI:

```bash
npx skills add https://github.com/stark-ai-de/agent-skills --list
npx skills add https://github.com/stark-ai-de/agent-skills --skill codex-spec-interviewer -a codex --copy -y
```

## Release Update Process

1. Update public or incubator skills.
2. Run `npm run validate`.
3. Run `pnpm format:check` and `pnpm lint`.
4. Run `npx skills add ./skills --list` locally.
5. Run `npm run smoke:install`.
6. Update `CHANGELOG.md`.
7. Add an ADR only if a decision changed.
8. Merge changes through a PR.
9. Run `Prepare Release`.
10. Review and merge the release PR.
11. Confirm the automatic `Publish Release` dry run passed on `main`.
12. Run `Publish Release` manually with `dry_run: false`.
13. Verify public install.
