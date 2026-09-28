# Unpublished v0.25.2: forward release recovery

## Decision and scope

The maintainer authorized skipping the never-published catalog version 0.25.2
on 2026-09-28. Prepare **0.25.3**, using the actual published **v0.25.1** as the
release-notes baseline. Do not create a placeholder v0.25.2 tag or release.
The existing 0.25.2 changelog section is retained as generated history, not as
proof that this version was published.

This is a bounded application of
[ADR-0050](adrs/0050-generate-release-prs-and-protect-publication.long.md),
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
and the authenticated original generated PR. The operator must retire #118's
pending label, without falsely marking it tagged.

The helper uses `release-please@17.6.0` and the ordinary manifest configuration.
Only its in-memory `releasedVersions["."]` becomes 0.25.1 and the next
`releaseAs` becomes 0.25.3. A read-only preview precedes creation of the existing
repository-scoped App token. The helper only calls `createPullRequests`, never
`createReleases`. The normal three-file provenance/CI checks remain mandatory.
After the manifest advances, the normal Release Please action is selected.

The package is installed outside the checkout in the runner's temporary
directory, without lifecycle scripts, before the App token is created. The
root dependency is pinned; this temporary install does not claim a frozen
transitive dependency graph. No repository dependency or plugin is changed.

Upstream implementation references:

- [Manifest API at 17.6.0](https://github.com/googleapis/release-please/blob/v17.6.0/src/manifest.ts).
- [Strategy release notes at 17.6.0](https://github.com/googleapis/release-please/blob/v17.6.0/src/strategies/base.ts).
- [Existing action entrypoint](https://github.com/googleapis/release-please-action/blob/v5/src/index.ts).

## Operator sequence

1. Read the fix PR, run `node scripts/validation/test-forward-release.mjs`,
   formatting, lint, release-management, post-release-receipt and the mandatory
   repository validation. Require green current-head hosted checks and resolved
   review findings before merge. The new contract workflow tests the guards;
   it does not claim an actual upstream API preview or release publication.
2. Immediately before the fix merge, verify that v0.25.2 and v0.25.3 are still
   absent and no old publisher is active. Comment on #118 that 0.25.2 was
   abandoned in favor of the reviewed forward recovery; remove only its
   `autorelease: pending` label. Never add `autorelease: tagged` to #118.
3. Merge the fix normally. Its main push selects the forward preparation lane.
   If needed, dispatch `release-please.yml` on current protected main. Do not
   rerun the old immutable failing workflow definition.
4. Inspect the real read-only preview and the App-generated 0.25.3 draft.
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

The observed main already contains plugin **1.7.2** from subsequent Jev work.
Keep it unchanged by this recovery. The earlier snapshot's 1.7.1/no-new-issue
expectation is no longer applicable. Compare actual release metadata and let
the existing reconciler produce a legitimate 1.7.2 handoff when necessary.
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
