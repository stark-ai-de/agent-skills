# Agent Skills Repository Release

Use this reference when preparing a release in `stark-ai-de/agent-skills`. For other skills repositories, prefer their local publishing docs first and adapt only the applicable checks.

## Scope

This repository publishes by GitHub release from `main`. Do not tag, push, dispatch release workflows, install globally, or change remote settings without explicit maintainer approval.

Use `docs/publishing.md` and `docs/validation.md` as the repo source of truth. This file is the skill-facing checklist.

## Release Surfaces

For public catalog changes under `skills/`:

- Bump each changed promoted skill's `metadata.version` in its `SKILL.md`.
- Leave unchanged promoted skill versions alone.
- Bump `package.json` to the catalog release version.
- Add a matching `CHANGELOG.md` release section.
- Keep release notes focused on user-visible catalog, policy, validation, and install changes.

Incubator-only changes do not require a package release unless they are being intentionally shipped with a catalog release.

## Local Preparation

Use the helper for package and changelog release surfaces:

```bash
npm run release:prepare -- --version NEXT_VERSION --dry-run
npm run release:prepare -- --version NEXT_VERSION
```

The helper updates only `package.json` and `CHANGELOG.md`. Update public skill `metadata.version` values directly.

## Required Checks

Run from the repository root:

```bash
npm run validate
pnpm format:check
pnpm lint
npm run release:intent -- --base-ref origin/main
npm run release:validate -- --base-ref origin/main
npm run list
npx skills@latest add ./skills --list
npm run smoke:install
npm run release:notes
git diff --check
```

Use `npx skills@latest add ./skills --list` for maintainer-checkout catalog discovery. Avoid `npx skills@latest add . --list` in a dirty checkout because ignored project-local helper skills under `.agents/skills/` can pollute the result.

## Dirty Worktree

When unrelated unstaged or untracked work exists, validate the staged release snapshot before calling it ready. A safe pattern is:

```bash
tmp=$(mktemp -d)
rm -rf "$tmp"
patch=$(mktemp)
git diff --cached --binary > "$patch"
git worktree add --detach "$tmp" HEAD
git -C "$tmp" apply "$patch"
(
  cd "$tmp"
  npm run validate &&
  pnpm format:check &&
  pnpm lint &&
  npm run release:intent -- --base-ref origin/main &&
  npm run release:validate -- --base-ref origin/main &&
  npm run list &&
  npx skills@latest add ./skills --list &&
  npm run smoke:install &&
  npm run release:notes &&
  git diff --check
)
git worktree remove --force "$tmp"
rm -f "$patch"
```

## Isolated Staged Release Branch

When the maintainer wants to push only the current staged release set without disturbing other agents working in the shared checkout, use a temporary worktree and apply the staged diff there. Do not switch branches, stash, commit, or unstage in the original checkout.

```bash
BRANCH=release/<short-topic>
WT=/tmp/agent-skills-release
PATCH=/tmp/agent-skills-release.patch

git diff --cached --binary > "$PATCH"
git worktree add -b "$BRANCH" "$WT" HEAD

cd "$WT"
git apply --index "$PATCH"

npm run validate
pnpm format:check
pnpm lint
npx skills@latest add ./skills --list
npm run smoke:install
npm run release:validate -- --base-ref origin/main

git commit -m "<release message>"
git push -u origin "$BRANCH"
```

After pushing, open a PR from the release branch. Remove the temporary worktree only after the branch is pushed and the original checkout state is no longer needed for comparison:

```bash
cd -
git worktree remove "$WT"
rm -f "$PATCH"
```

If the release files are staged and unrelated work should be kept aside, recommend:

```bash
git stash push --keep-index --include-untracked -m "wip unrelated work"
git switch -c release/<short-topic>
git commit -m "<release message>"
git push -u origin release/<short-topic>
git switch main
git stash apply
```

Use `git stash apply` instead of `pop` when the maintainer wants to keep a backup until the restore is confirmed.

## Publish Boundary

After merge to `main`, the maintainer may run the manual `Publish Release` workflow:

1. `dry_run: true` for the final readiness check.
2. `dry_run: false` only after explicit approval to publish.

Report the release version, validation status, public skills listed, and any unverified external state.
