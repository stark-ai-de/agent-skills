# GitHub Pages pull-request previews

The production catalog remains at `https://stark-ai-de.github.io/agent-skills/`,
published from `main`. A separate repository, `stark-ai-de/agent-skills-preview`,
hosts an explicitly requested PR snapshot at
`https://stark-ai-de.github.io/agent-skills-preview/pr-<number>/`.

GitHub's native Pages preview input is [not publicly available](https://github.com/actions/deploy-pages#inputs-).
The separate repository preserves the Astro/Actions architecture from
[ADR-0017](adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md)) without
replacing production or weakening its environment protection.

## Refresh a preview

The preview repository runs the reviewed copy of
[pages-preview.yml](../.github/workflows/pages-preview.yml). It accepts only the
current full commit SHA of an open PR whose source is `stark-ai-de/agent-skills`.
It does not deploy fork code or accept a moving branch name. Run it explicitly
after pushing the desired source commit:

```sh
preview_pr=90
preview_sha=$(gh pr view "$preview_pr" --repo stark-ai-de/agent-skills --json headRefOid --jq .headRefOid)
gh workflow run pages-preview.yml \
  --repo stark-ai-de/agent-skills-preview --ref main \
  -f pr="$preview_pr" -f source_sha="$preview_sha"
```

Wait for both the build and deployment jobs. Open the PR's preview URL, check
the PR/commit banner, and compare `/agent-skills-preview/preview.json` with the
requested SHA before posting the link. Build success alone is not deployment
proof. The live snapshot does not automatically follow subsequent PR pushes.

This small preview site keeps **one manually requested PR snapshot at a time**.
Another deployment replaces the previous preview site; older PR links may stop
working. Closing or merging a PR does not automatically remove the snapshot.
Maintainers can replace it with the next requested preview or disable Pages in
the preview repository when it is no longer needed.

## Hosting and permission boundary

- The preview repository contains the reviewed workflow and its operator README;
  source files remain in `agent-skills`. After changing the canonical workflow,
  review it and copy the same bytes into the preview repository before dispatch.
- Pages uses the **GitHub Actions** publishing source. Its `github-pages`
  environment permits only `main` in the preview repository.
- Both workflow jobs refuse to run in any other repository or from another ref.
  The source repository's ordinary Pages workflow retains its `main` guards.
- The build receives read-only repository permissions and no deployment secrets.
  A separate job gets Pages/OIDC permissions and deploys only the generated
  artifact. Source checkout does not persist Git credentials.
- Only generated site output and preview metadata are uploaded. Raw benchmark receipts, local catalogs, private
  specs, credentials and dependency folders are not deployment content.

The visible preview banner and `noindex, nofollow` metadata distinguish the
snapshot from a release. Navigation, assets and manifest stay under the preview
prefix; source and documentation links identify the same reviewed commit.
Preview publication does not promote a skill, publish packages or merge its PR.

## Local validation

Run the normal production build first, then the preview build with both inputs:

```sh
pnpm run lint:actions
pnpm run validate:site
AGENT_SKILLS_PREVIEW_PR=90 \
  AGENT_SKILLS_PREVIEW_SHA="$(git rev-parse HEAD)" \
  pnpm run validate:site
```

The production defaults must remain unchanged. The preview gate checks the
isolated path, source identity and indexability alongside the site contract.
After deployment, verify the homepage, intended skill detail, benchmark table,
assets and mobile navigation in a browser. Verify that the production URL still
serves its previously deployed content.
