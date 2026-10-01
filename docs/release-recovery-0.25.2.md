# Unpublished v0.25.2: forward release recovery

## Decision and scope

The maintainer authorized skipping the never-published catalog version 0.25.2
on 2026-09-28. Prepare **0.25.3**, using the actual published **v0.25.1** as the
release-notes baseline. Do not create a placeholder v0.25.2 tag or release.
The existing 0.25.2 changelog section is retained as generated history, not as
proof that this version was published.

This is a bounded application of
<!-- prettier-ignore -->
[ADR-0050](adrs/0050-generate-release-prs-and-protect-publication.short.md) ([Long, canonical](adrs/0050-generate-release-prs-and-protect-publication.long.md) · [Guide](adrs/0050-generate-release-prs-and-protect-publication.guide.md)),
not a new publication or historical-artifact recovery lane. Release Please
still generates the root manifest, package version and changelog. Publication,
its single protected environment approval, direct artifacts, provenance,
post-release evidence and the read-only completion job remain unchanged.

## Incident identity

- Abandoned release PR: #118.
- Abandoned merge: `7dbf2e96c9305d42120394e615c3fa8cb19d13fa`.
- Published baseline: v0.25.1 at `f186e5ab3c43cc13f70af2adc1dc70bb1bf3ed3b`.
- Observed main: `de81dc9e7fbc5516855f4ffb2641bbaf9aee26d4`.
- Release Please failure: run `36441488940`, `Invalid previous_tag parameter`.

The missing original push event remains unexplained. It is not necessary to
claim a platform root cause to complete this forward recovery.

## Implementation

While the real root manifest is exactly 0.25.2, the existing trusted
`release-please.yml` selects an incident-specific preparation helper. Its
GET-only preflight requires protected current main containing the abandoned
merge, the known published baseline, absent 0.25.2 and 0.25.3 tags/releases,
and the authenticated original generated PR. The preview may inspect #118 while its pending label remains. The operator
must retire that label only after a successful real preview, without falsely
marking the abandoned version tagged.

The helper uses `release-please@17.6.0` and the ordinary manifest configuration.
Only its in-memory `releasedVersions["."]` becomes 0.25.1 and the next
`releaseAs` becomes 0.25.3. A non-persisting preview uses the existing repository-scoped App token
after token creation: GitHub requires Contents write permission for Generate
Release Notes even though the generated notes are not saved. The helper only calls `createPullRequests`, never
`createReleases`. The normal three-file provenance/CI checks remain mandatory.
After the manifest advances, the normal Release Please action is selected.

The package is installed outside the checkout in the runner's temporary
directory, without lifecycle scripts, before the App token is created. The
tool dependency is pinned in the repository workspace and its transitive graph
is frozen in the single root `pnpm-lock.yaml`. The temporary workspace uses
`--frozen-lockfile --ignore-scripts` and retains the repository's strict build,
exotic dependency, release-age and no-downgrade trust policy. Plugin dependencies
remain unchanged.

Upstream implementation references:

- [Manifest API at 17.6.0](https://github.com/googleapis/release-please/blob/v17.6.0/src/manifest.ts).
- [Strategy release notes at 17.6.0](https://github.com/googleapis/release-please/blob/v17.6.0/src/strategies/base.ts).
- [Existing action entrypoint](https://github.com/googleapis/release-please-action/blob/v5/src/index.ts).

## Operator sequence

1. Read the fix PR, run `bun --bun scripts/validation/test-forward-release.mjs`,
   formatting, lint, release-management, post-release-receipt and the mandatory
   repository validation. Require green current-head hosted checks and resolved
   review findings before merge. The new contract workflow tests the guards;
   it does not claim an actual upstream API preview or release publication.
2. Verify that v0.25.2 and v0.25.3 are still absent and no old publisher is
   active. Keep #118 pending until the actual library preview succeeds.
   The GET-only preflight and plan allow pending; apply still refuses it.
3. Merge the fix normally. Its main push selects the forward preparation lane.
   If needed, dispatch `release-please.yml` on current protected main. Do not
   rerun the old immutable failing workflow definition.
4. Inspect the real non-persisting preview. After success, comment on #118
   that 0.25.2 was abandoned in favor of this recovery; remove only its
   `autorelease: pending` label, never add `autorelease: tagged`. If the first
   run stopped at this apply guard, rerun that current-main preparation job
   only after verifying that main has not moved. Inspect the App-generated
   0.25.3 draft.
   Require exactly the three root release files, an unchanged old changelog,
   notes covering changes since v0.25.1, and green signature/provenance checks.
   Do not hand-edit its generated commit. Mark it ready and merge normally.
5. Require the successful push Validate and direct artifacts for the exact
   new release merge. Follow its Publish Release run, approve the existing
   `release` environment once using an authorized reviewer, then observe
   Publish, Post-release Evidence and `release-completion` through success.
6. Verify tag/release/source SHA, all three direct assets and digests, latest
   release identity, the new PR's tagged/not-pending labels and the handoff
   outcome. Report any manual portal task separately from GitHub completion.

Use [the publishing runbook](publishing.md) for commands and existing recovery
semantics. Approval restrictions and disabled bypass remain binding. No force
push, manual version write, fabricated evidence, tag creation or asset clobber.

## Updated plugin baseline

The rechecked main `1e04e0cf370bd19ec119da9d6e297ceaf5ed2b1c` contains
plugin **1.7.3** after the subsequent Jev and Architecture Compass merges.
Keep it unchanged by this recovery. The earlier snapshot's 1.7.1/no-new-issue
expectation is no longer applicable. Compare actual release metadata and let
the existing reconciler produce a legitimate current-version handoff when necessary.
Do not reopen or repurpose the closed older handoff #114. GitHub publication
does not establish a completed OpenAI portal upload or listing update.

## Stop and retry boundaries

Any unexpected main, baseline, root version, tag, release, pending publication,
App provenance or generated file set stops the affected operation. A failed
network/write response is an uncertain result: inspect remote state before
retrying; do not manufacture a second release PR. Once 0.25.3 is merged, this
helper must not be used again. Use the normal publisher retry semantics for
later transient failures. Remove dormant incident machinery in a separately
reviewed cleanup after the complete release receipt is recorded.

## Follow-up verification before merge

The 2026-09-28 review found and corrected the 17.6.0 property spelling
`skipGithubRelease` and the assumption that the package entry point exports
`Version`. The helper now uses the parsed version instance's constructor.
Plain-script contract tests use the repository Bun runtime instead of
`node:test`, and both workflows use the required quoted Bun version path.
These corrections do not constitute a successful real library preview.

An isolated strict dependency probe in run `36454589916`, job `109037572191`,
refused `@octokit/endpoint@9.0.6` with `ERR_PNPM_TRUST_DOWNGRADE`. That is a
provenance-policy failure, not proof of malicious code. Qualify a frozen
transitive graph under the existing supply-chain policy before executing the
library with the release App token. Do not silently omit the policy or
replace the package with 9.0.5, which is affected by GHSA-x4c5-c7rf-jjgv.
PR #120 is a duplicate bootstrap effort, not a second recovery to merge.

## Frozen bootstrap qualification

The tool workspace member under
[`scripts/release/forward-release-tool/`](../scripts/release/forward-release-tool/)
retains Release Please **17.6.0** in the repository's single root pnpm lockfile,
so the existing build-toolchain SBOM inventory includes its dependencies.
The workflow copies the root lockfile, workspace policy and all workspace
manifests into runner-temporary storage, then installs only the tool member
with `--prod --frozen-lockfile --ignore-scripts`, preserving strict dependency builds,
blocked exotic dependencies, the 24-hour release-age guard and the
`no-downgrade` provenance policy. No new trust-policy exception is added;
the root policy's existing Astro-only `tinyexec@1.2.2` exception does not
apply to the release tool graph.

Parent-scoped overrides in the root workspace policy retain the qualified tool graph:

- `@octokit/request@8.4.1` uses `@octokit/endpoint@10.1.4`; do not substitute
  the vulnerable 9.0.5 or restore the refused 9.0.6.
- `normalize-package-data@2.5.0` uses `semver@7.8.5`; its old 5.7.2 dependency
  also fails the provenance policy.
- `release-please@17.6.0` keeps the previously qualified `js-yaml@4.3.2` instead
  of reusing the root graph's 4.3.1, affected by
  [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh).

The [installation contract test](../scripts/validation/test-forward-release-install.mjs)
loads the actual installed library and checks REST path/query encoding,
GraphQL methods/variables, valid/invalid version normalization, and the
repository's Manifest parsing and in-memory forward-baseline configuration.
All transport responses are offline fixtures. The Release Please workflow
runs this test before creating the release App token; the forward-contract
workflow repeats the frozen installation and tests on relevant pull requests.

Local qualification on 2026-10-01 installed 179 dependencies under the retained
policy. The shared-lock `pnpm audit --prod` reports no known vulnerabilities
on release-tool dependency paths, but also inventories uninstalled workspace
members and reports existing site findings; review those separately.
This is installation and offline API compatibility evidence. The protected-main
App-backed preview, generated release PR, publication and post-release receipt
remain separate checks in the operator sequence above.
