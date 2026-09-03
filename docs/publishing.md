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

Feature pull requests record component impact. Release Please prepares the root
catalog version in a separate draft pull request, and GitHub Release publication
runs behind the protected `release` environment on `main`.

### Record impact in the feature PR

Public skill versions are independent from the repository package version:

- New promoted skills may start at `metadata.version: "0.1.0"`.
- Changed promoted skills must increase their own `metadata.version`.
- Unchanged promoted skills keep their existing `metadata.version`.
- A bundled-skill change also increases `plugins/stark-ai-developer.source.json`.
- The feature PR does not change the root package version,
  `.release-please-manifest.json`, or add a root release heading.

Record or inspect the intended component impact without changing root release
files:

```bash
npm run release:manage -- impact --kind patch --skill architecture-compass
npm run release:intent -- --base-ref origin/main
npm run release:validate -- --base-ref origin/main
```

`scripts/release/prepare-release.mjs` intentionally refuses local version
writes. Release Please is the sole generator of the root release change.
Historical `## vX.Y.Z - date` headings and new Release Please headings are both
valid; historical sections and the existing `## Unreleased` section remain
unchanged in the generated PR.

### Generate the release PR

After feature work merges, the `Release Please` workflow uses a repository-scoped
GitHub App token with Contents, Pull requests, and Issues write permissions. The
App needs no webhooks. It creates or updates a draft titled
`chore(release): release <version>`. The PR changes exactly:

- `.release-please-manifest.json`;
- `package.json`;
- `CHANGELOG.md`.

Before the App private key is used, a credentialless preflight requires the
workflow definition, checkout, event ref, workflow SHA, and remote branch tip to
be the same protected `main` revision. A manual dispatch from another branch or
tag therefore fails before GitHub creates the write-capable App token.

Pull-request validation matches the configured App ID against GitHub's canonical
App-bot actor payload, requires the repository-local Release Please branch and
exactly one App-bot-authored head commit with GitHub's valid signature, then
validates the complete three-file transformation. Unknown actor metadata fails
closed. Publication repeats the merged-PR provenance check against the exact
candidate commit.

The baseline is `0.20.1`; `v0.20.0` remains unpublished and the first generated
catalog release is `v0.21.0`. `skip-github-release: true` reserves tags and
GitHub Releases for the reconciliation workflow. Merging a generated release PR
does not run Release Please again.

While the manifest remains at the `0.20.1` bootstrap baseline, the workflow
selects `release-please-config.v0.21.0.json`. That manifest configuration sets
the package-local `release-as: 0.21.0` value that Release Please actually reads
in manifest mode. After the manifest advances, the workflow selects the normal
`release-please-config.json`, so later versions return to Conventional Commit
calculation. Generated PR validation independently rejects any first version
other than `0.21.0`.

Release Please labels an open draft `autorelease: pending`. After publication
and evidence dispatch, the protected publisher uses a new repository-scoped App
token to add `autorelease: tagged` and remove `autorelease: pending` for that
exact generated PR. A failed dispatch or label transition keeps the run failed
and is safe to retry; it cannot silently unlock the next generated release PR.
If `main` advanced after the candidate was validated, recover a transient
failure through **Actions → Publish Release → original run → Re-run jobs** or
`gh run rerun <original-run-id>`. A normal new
`npm run release:manage -- publish --confirm` dispatch always targets current
`main` and is not a retry of the older candidate.

If an immutable workflow-code defect blocked the original run before any target
tag or GitHub Release existed, use the narrower recovery route:

<!-- prettier-ignore -->
[ADR-0053](adrs/0053-recover-unpublished-releases-through-protected-replacement-candidates.short.md) ([Long, canonical](adrs/0053-recover-unpublished-releases-through-protected-replacement-candidates.long.md) · [Guide](adrs/0053-recover-unpublished-releases-through-protected-replacement-candidates.guide.md))

Merge only the reviewed recovery controller, validation, runbook, and
successor-ADR files, then dispatch a read-only plan with the original full
generated-release merge SHA:

```bash
npm run release:manage -- publish-plan \
  --recovery-release-sha ORIGINAL_RELEASE_SHA \
  --confirm
```

The recovery preflight authenticates the original Release Please App-owned PR,
requires successful hosted `Validate` runs for its exact head and merged
origin, proves a bounded allowed diff to the exact protected current `main`,
verifies unchanged root release inputs, and requires the target tag and Release
to be absent. Readiness then requires a fresh successful `Validate` run for the
replacement and byte-identical hosted ZIPs from both revisions. Each metadata document must identify its own commit
while retaining the same release, plugin, archive profile, sizes, and digests.
The replacement SHA—not the origin—becomes the tag, release-subject,
workflow/source-digest, and environment-approval revision. Any ambiguity blocks
before the write-capable job.
Create both labels in **Settings → Issues → Labels** before the first dispatch;
`setup-check` is read-only and fails if either label is absent.

### Publish Release

Merging the generated release PR changes `.release-please-manifest.json` on
`main` and starts `Publish Release`. A manual `dry_run: true` dispatch remains a
read-only readiness option.

The readiness job has read-only permissions. It binds the workflow and hosted
`Validate` to the exact generated-release SHA, downloads `openai.zip`,
`portable.zip`, and `release-subject.json` as three direct artifacts with no
extraction or repacking, validates them, and computes the remote plan. The SHA
must remain equal to or an ancestor of the currently observed protected `main`;
later feature commits belong to the next release cycle and do not invalidate a
waiting approval. Diverged, removed, or unprotected candidates fail closed. The
write-capable `publish` job is the only job targeting `environment: release`;
it waits for approval before it can attest, tag, upload, or publish. Before the
first API mutation it verifies that the environment exists, has a required
reviewer, uses exactly one custom deployment-branch policy named `main`,
confirms that `main` is protected, and disables administrator bypass.

### Post-release evidence and lifecycle lanes

`dry_run: true` never creates an artifact, attestation, tag, release, or asset.
A real publish may resume a matching tag or draft, uploads only missing exact
subjects, never replaces a named asset, and publishes the completed draft last
with `make_latest=true`. A published target is satisfied only when
`/releases/latest` returns the same release ID and tag. Only the two ZIPs are
attested. The reconciler creates annotated tag objects and refs through the
authenticated GitHub Git API; checkout credentials are never persisted.
`v0.20.1` is the explicit legacy two-asset boundary; from `v0.21.0`
onward all three direct assets are required. An exact mutable release may accept
a missing validated JSON without a valid ZIP attestation only when both exact
ZIP assets have creation timestamps strictly before publication; after upload,
the JSON timestamp must be strictly later. Equal, missing, or invalid timestamps
block. A missing ZIP additionally requires its existing valid Publish Release
attestation. Immutable, ambiguous, mismatched, non-latest, or unknown states
fail closed. No published repair creates a new attestation, and
`gh release upload --clobber` is prohibited.

The [`Post-release Evidence`](../.github/workflows/post-release-evidence.yml)
workflow is `workflow_dispatch`-only. `Publish Release` explicitly dispatches it
through protected `main` whenever `post_release_dispatch_required=true`, after
both first publication and an allowed repair. Before checkout it resolves the
current default branch through the GitHub
API, requires protected `main`, and binds `github.workflow_ref` and
`github.workflow_sha` to that branch head. The tracked
[`prepare-release-subjects.mjs`](../scripts/release/prepare-release-subjects.mjs)
wrapper runs the tag-local [`verify-release-reproducibility.mjs`](../scripts/release/verify-release-reproducibility.mjs)
script and translates the legacy evidence format used by historical tags.
Hosted `Validate` uses the repository-owned script to build and upload the three
direct artifacts on `main`. `Publish Release` downloads those exact bytes for
attestation and publication; it does not require a local packaging workflow.
The local `npm run build:release-subjects` command
writes to `dist/release-subjects/` using the same script and is only a manual
backup if the hosted artifact is unavailable. Post-release jobs rebuild from
the exact release tag. The workflow downloads the published ZIPs and, from
`v0.21.0`, the hosted `release-subject.json`. ZIP bytes must match the tag-bound
subjects. Hosted JSON is compared semantically with the tag rebuild: commit,
versions, clean state, archive profile, ZIP sizes, and digests must match; JSON
byte equality and a pre-populated tag in the hosted JSON are not required. It
verifies attestations against the downloaded ZIPs,
files, the release commit, `refs/heads/main`, and the unique
`publish-release.yml` signer workflow, and uploads a sanitized receipt carrying
the protected verifier identity. Attestations made by `attest-release.yml` do
not satisfy this publication-pass contract.
Historical `v0.19.1` is explicitly retrospective and not
pre-publication-attested; no current branch output may be used to upgrade that
historical status.

Use the [post-release receipt schema](../skill-evals/stark-ai-developer/evidence/post-release-receipt.schema.json)
and `npm run validate:post-release-receipt -- --file <receipt.json>` when
reviewing a receipt. Receipts remain workflow artifacts and are not committed.
Schema v1 keeps a common client/lifecycle envelope for sanitized validation;
archive receipts use `not_a_client_lifecycle_receipt`.

Feature impact means a pull request changed a skill or bundled plugin and raised
the affected component versions without creating root release files. Generated
release intent means Manifest, Root-Package, and one Changelog release section
changed together and no other files changed. Pull request validation checks both
contracts and runs root release validation only for the generated release PR.

GitHub Actions job summaries name the next operator follow-up after each run.

### CLI and GitHub web equivalents

All local commands dispatch hosted workflows or APIs; none creates a local tag
or release. Hosted mutations require `--confirm`.

| CLI                                                                                    | GitHub web equivalent                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run release:manage -- status`                                                     | Open **Actions** and **Releases**.                                                                                                                                                                                                           |
| `npm run release:manage -- setup-check`                                                | Configure the App variable/private-key secret, create `autorelease: pending` and `autorelease: tagged`, then configure **Settings → Environments → release** with a required reviewer, one custom `main` branch policy, and no admin bypass. |
| `npm run release:manage -- impact --kind patch\|minor\|breaking [--skill NAME]`        | Review the feature diff and affected component versions.                                                                                                                                                                                     |
| `npm run release:manage -- release-pr --confirm`                                       | **Actions → Release Please → Run workflow**.                                                                                                                                                                                                 |
| `npm run release:manage -- publish-plan [--recovery-release-sha SHA] --confirm`        | **Actions → Publish Release → Run workflow**, `dry_run=true`; paste the original full release SHA only for ADR-0053 controller-defect recovery.                                                                                              |
| `npm run release:manage -- publish [--recovery-release-sha SHA] --confirm`             | **Actions → Publish Release → Run workflow**, `dry_run=false`; omit the SHA for an ordinary current generated-release candidate, or repeat the plan-proven recovery SHA.                                                                     |
| `npm run release:manage -- approve --run-id ID [--recovery-release-sha SHA] --confirm` | Open the waiting run/deployment and approve the `release` environment; for recovery, verify the run title and repeat the exact original SHA.                                                                                                 |
| `npm run release:manage -- post-release --tag vX.Y.Z --confirm`                        | **Actions → Post-release Evidence → Run workflow** with the exact tag.                                                                                                                                                                       |
| `npm run release:manage -- openai-handoff --tag vX.Y.Z`                                | Verify the latest three-asset release and newest successful exact-tag Evidence run, then download `openai.zip` and open the OpenAI submission portal.                                                                                        |

Equivalent local release validation:

```bash
node scripts/release/validate-release.mjs
node scripts/release/print-release-notes.mjs
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
`dist/openai/stark-ai-developer-1.1.0.zip` is the local OpenAI-native
harness-first submission fallback, generated from ephemeral adapter staging at
package time. The normal portal handoff source is the direct `openai.zip` asset
from the verified GitHub Release; its bytes came unchanged from successful
hosted `Validate` for the exact release commit.
Canonical `agents/openai.yaml` is copied unchanged from each bundled skill into
that archive; the adapter does not generate or overlay skill-local metadata.
`dist/skills/*.zip` contains one skill root per optional standalone archive.
These artifacts do not replace canonical sources. A generated archive is not
by itself proof of public-directory publication. First-publication observations
for the OpenAI plugin live in
[`docs/listing/openai/stark-ai-developer-first-publication.md`](listing/openai/stark-ai-developer-first-publication.md).
Upload the direct GitHub Release asset `openai.zip` to the OpenAI portal, not the
portable Agent Plugins zip or a locally rebuilt archive.

GitHub Releases also provide source archives for each tag, and normal
standalone installation uses the skills CLI:

`npm run build:release-subjects` writes the same final `openai.zip`,
`portable.zip`, and versioned `release-subject.json` subject set to
`dist/release-subjects/`; it is the local fallback, not the normal publication
path. The JSON subject is the release contract; standalone skill archives may
retain their own independent checksum files.

`npm run generate:release-evidence` is the explicit release-preparation command.
It refreshes
[`docs/listing/openai/stark-ai-developer-release-evidence.json`](listing/openai/stark-ai-developer-release-evidence.json)
with the source commit/tag, projection and manifest hashes, complete archive
inventories, the clean/dirty source state, and a deterministic release-input
tree digest. Portal draft IDs, approval, publication, and client lifecycle
observations remain separate external evidence and are never inferred from this
file. After first publication, sanitized portal observations belong in
[`docs/listing/openai/stark-ai-developer-first-publication.md`](listing/openai/stark-ai-developer-first-publication.md).
The committed evidence recipe may lag listing-asset changes until a maintainer
regenerates it from a clean tagged identity.

Directory identity is `npm run verify:openai-directory` locally. The dedicated
`ChatGPT Directory Identity` workflow runs the same strict script through
`.github/actions/verify-openai-directory` on a schedule or manual dispatch after
publication; deterministic hosted `Validate` does not fetch the live directory.
That gate covers the directory document (`DIR-001`) and public category-catalog
membership (`DIR-002`). Provenance for later
GitHub Releases is `Publish Release` plus `Post-release Evidence`; the local
fallback is `npm run build:release-subjects`. Annotated GitHub Release tags on this
repository are unsigned today. The existing
`.github/workflows/attest-release.yml` attests archives from an existing tag;
it does not replace that two-stage proof. Do not regenerate freeze JSON except
from a clean exact-tag identity.

The committed repository-local catalog is
[`.agents/plugins/marketplace.json`](../.agents/plugins/marketplace.json),
generated from `plugins/stark-ai-developer.source.json` by `npm run sync:agent-plugin`.
Its source path is resolved from the repository root and points to the portable
projection. The skills-only entry uses
`policy.installation: "AVAILABLE"` and `policy.authentication: "ON_INSTALL"`:
current marketplace clients support `ON_INSTALL` and `ON_USE` authentication
triggers, and explicit `ON_INSTALL` is the conservative no-auth representation
until OpenAI documents a distinct no-auth value. Do not copy this file
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

## Operator follow-up

GitHub Actions job summaries point here after a run. These checks are product
and portal work. Directory identity is the `verify:openai-directory` gate.
Later GitHub Release provenance is `Publish Release` plus `Post-release Evidence`.

### Before a listing update

- Re-read the official plugin documents listed in the plugin spec Appendix C.
- Confirm legal publisher name, support contact, privacy controller, terms
  jurisdiction, security-report address, and domain ownership.
- Submit listing updates from Platform organization `org-dz0kZIfZpiaMc7YFjxGcsrk7`
  with Apps Management: Write.
- Review new validation warnings before publishing.

### After Publish Release or Post-release Evidence

1. Download the pre-publication and post-release receipt artifacts.
   A recovery run against an already-published release intentionally creates no
   new pre-publication receipt; dispatch `Post-release Evidence` after the
   repair and use that new post-release receipt.
2. Search for **stark AI Developer** in the public Plugins Directory and check
   name, developer, copy, category, capabilities, assets, prompts, and legal links.
3. Verify public CLI install with the commands in Release Artifacts above.
4. On a clean eligible account (no prior plugin, publisher privileges, or local
   marketplace), complete ChatGPT web/desktop add, enable, invoke allowed
   bundled skills, disable, and remove. Do not store session cookies. For
   `v0.19.1`, record `update` as `not_applicable` with reason
   `first_public_version`. Later public releases record an observed update.
5. Copy
   [`skill-evals/stark-ai-developer/evidence/manual-client-lifecycle-receipt.template.json`](../skill-evals/stark-ai-developer/evidence/manual-client-lifecycle-receipt.template.json)
   to a local release-specific file, fill operation status and a short reason,
   and validate with
   `npm run validate:post-release-receipt -- --file <receipt.json>`. Do not copy
   cookies, session identifiers, prompts, transcripts, private endpoints, or
   personal account details into the receipt.

### After GitHub Pages deploy

Open the published Pages URL and confirm plugin, privacy, terms, support, and
security routes return HTTP 200.

### Before opening a production portal submission

1. Review `plugins/stark-ai-developer.source.json` membership, order, identity,
   `1.1.0`, Node `24.18.0`, pnpm `11.22.0`, and `zip-store-v1`.
2. Review the listing source and the packaged `.codex-plugin/plugin.json`.
3. Inspect all six canonical `agents/openai.yaml` files and their byte-identical
   generated copies.
4. Run focused and aggregate validation, inspect the ZIP listing, and confirm
   two-build checksum equality.
5. Install from the repository marketplace on a clean clone and test direct and
   implicit invocation on each supported surface.
6. Test standalone skills in the Codex IDE extension.
7. Open every public URL and confirm publisher organization, verified identity,
   prompts, tests, and release notes.
8. Verify `.agents/plugins/marketplace.json` still points to
   `./plugins/stark-ai-developer` after OpenAI-adapter tests.

### OpenAI portal submission

1. Open the OpenAI Platform plugin submission portal from the selected
   publishing organization.
2. Create a plugin draft and choose **Skills only**.
3. Enter the public listing and verified developer identity.
4. Upload the exact direct `openai.zip` asset from the verified GitHub Release.
5. Verify all six packaged skill icons. If the portal ignores package metadata,
   restore the reviewed `radar`, `chat`, `bolt`, `hierarchy`, `search`, and `pen`
   glyphs.
6. Upload `site/public/logo.png` as the light Plugin Info logo.
7. Upload `site/public/logo-dark.png` as the dark Plugin Info logo and Composer icon.
8. Review automated scans and every portal warning, including
   `manifest_normalized` if shown.
9. Add no more than three realistic starter prompts.
10. Add at least six positive and three negative tests for v1.
11. Add release notes and complete policy attestations only after listing,
    skills, prompts, tests, and privacy claims are confirmed.
12. Submit for review. Treat non-blocking `skill_metadata_ignored` warnings as
    expected when `SKILL.md` carries `metadata:`.
13. Track requested changes as release-blocking issues; update source artifacts
    first, regenerate, retest, and resubmit.
14. After approval, explicitly publish from the portal.
15. Verify light/dark rendering after propagation and confirm the listing appears
    in the universal Plugins Directory shared by
    ChatGPT and Codex. There is no separate Codex public directory URL.

## Release Update Process

1. Update public or incubator skills.
2. Run `npm run smoke:fingerprint` and record the initial candidate digest before any broader local gate.
3. Run `npm run validate`.
4. Run `pnpm format:check` and `pnpm lint`.
5. Run `npx skills@latest add ./skills --list` locally.
6. Run `npm run smoke:install` and require its emitted digest to match the initial fingerprint.
7. Run `npm run smoke:fingerprint` again after the last local gate and require the digest to remain unchanged.
8. For public catalog changes, bump changed skill/plugin versions in the feature
   PR; do not change root release files there.
9. Add an ADR only if a decision changed.
10. Confirm the release-intent PR gate passed.
11. Merge changes through a PR.
12. Let Release Please create the draft root release PR and merge it after review.
13. Inspect automatic Publish readiness; optionally dispatch `dry_run: true` again.
14. Approve the waiting `release` environment deployment.
15. Inspect the pre-publication receipt and the explicitly dispatched `Post-release Evidence`
    receipt, or dispatch the latter with the exact tag when a repeat is needed.
16. Complete [Operator follow-up](#operator-follow-up), including the manual OpenAI handoff.
