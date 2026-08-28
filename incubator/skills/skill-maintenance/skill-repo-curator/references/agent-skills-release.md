# Agent Skills Repository Release

Use this reference when preparing a release in `stark-ai-de/agent-skills`. For
other repositories, prefer their local publishing contract.

## Scope and authority

This repository records feature impact in ordinary pull requests, lets Release
Please generate the root version pull request, and publishes through a protected
GitHub environment. Do not push, dispatch a mutating workflow, approve an
environment, create a tag or release, or update OpenAI without explicit
maintainer approval.

Use `docs/publishing.md` and `docs/validation.md` as the source of truth. This
file is the skill-facing route through that finite workflow.

## Feature pull request

- Increase every materially changed skill's `metadata.version`.
- Increase `plugins/stark-ai-developer.source.json#version` when a bundled skill
  changes, then run `npm run sync:agent-plugin`.
- Do not change the root package version, `.release-please-manifest.json`, or
  root `CHANGELOG.md`.
- Record the intended impact without writing release files:

```bash
npm run release:manage -- impact --kind patch --skill SKILL_NAME
npm run release:intent -- --base-ref origin/main
npm run release:validate -- --base-ref origin/main
```

`npm run release:prepare` is a refuse-redirect. Release Please is the sole
writer of root release metadata.

## Generated release pull request

After feature work merges, start or inspect the App-owned draft through
`npm run release:manage -- release-pr --confirm` or the `Release Please`
workflow in GitHub Actions. The generated PR may change only:

- `.release-please-manifest.json`;
- `package.json` version;
- one newest `CHANGELOG.md` release section.

Merge it only after hosted Validate proves its exact content and App ownership.

## Protected publication

Use the read-only dry run before publication:

```bash
npm run release:manage -- publish-plan --confirm
```

For a real publication, dispatch `publish --confirm` or use the GitHub
`Publish Release` workflow with `dry_run: false`, then approve the waiting
`release` deployment by exact run ID:

```bash
npm run release:manage -- publish --confirm
npm run release:manage -- approve --run-id RUN_ID --confirm
```

The hosted workflow owns the annotated tag, three direct assets, ZIP
attestations, Latest state, and explicit post-release evidence dispatch. Local
commands never create tags or releases.

## Evidence and OpenAI handoff

If evidence needs an explicit retry, dispatch only the exact tag:

```bash
npm run release:manage -- post-release --tag vX.Y.Z --confirm
```

After the exact-tag Evidence run succeeds, use the read-only handoff check:

```bash
npm run release:manage -- openai-handoff --tag vX.Y.Z
```

Download the direct GitHub Release asset `openai.zip`; do not rebuild or repack
it. Follow the portal icon, light/dark logo, composer-icon, propagation, and
directory checks in `docs/publishing.md`.

## Required local proof

Select checks from the changed contracts. A release-intent candidate requires
the focused release gates and one final frozen `npm run validate`, followed by
`pnpm format:check`, `pnpm lint`, and `git diff --check`. Report local, hosted,
publication, post-release, and OpenAI evidence as separate layers.
