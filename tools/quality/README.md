# Shared quality migration

Owner: repository maintainers, under [ADR-0080](../../docs/adrs/0080-consume-shared-code-quality-policy.short.md) ([Long, canonical](../../docs/adrs/0080-consume-shared-code-quality-policy.long.md) · [Guide](../../docs/adrs/0080-consume-shared-code-quality-policy.guide.md)).

This is a partial migration of existing source. A passing baseline gate means no growth against the reviewed diagnostic groups and numeric allowances; it does not mean zero lint findings or persistent tracking of individual functions.

## Initial adoption

- Base source: `2267cbcab9605e5f0612abde34d83ec7a85ecbce`.
- Initial capture: real Node-owned Oxlint command in `scripts/quality/report.mjs`, using the candidate's shared package pin, config and source scope.
- Initial shared source and versions: the capture-time Git pin and peers remain in `initial-capture.json`; current qualified dependency and archive integrity are recorded in `package.json` and `pnpm-lock.yaml`.
- Baseline: `lint-baseline.json`, generated through the provider's `normalizeLint` and `createBaseline` helpers from source paths already present at the base revision.
- New quality orchestration, configurations and governance test: no initial allowance.
- Coverage: maintained JavaScript/TypeScript under the roots in `scripts/quality/scope.mjs`, including the separate review-video authoring workspace; generated/vendor/invalid-fixture exclusions remain explicit there.
- Preserved protection: the existing `pnpm run lint` correctness gate remains blocking alongside the shared migration gate.
- Exact capture counts and digest: `initial-capture.json`. It describes this initial migration, not future pruned baselines.

## Daily commands

| Task                    | Command                                          | Result                                                                                                |
| ----------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Inspect debt            | `pnpm run quality:report`                        | Read-only totals by rule and file; available reductions after a passing full comparison               |
| Inspect locations       | `pnpm run quality:report -- scripts/example.mjs` | All selected-file findings, including inherited debt, with original messages and `file:line:column`   |
| Export evidence         | `pnpm --silent run quality:report -- --json`     | JSON with normalized findings, raw diagnostics, regressions and summaries                             |
| Apply selected fixes    | `pnpm run quality:fix -- scripts/example.mjs`    | Safe shared-policy fixes to explicit files; remaining diagnostics and selected-file regression status |
| Run the full gate       | `pnpm run validate:quality`                      | Consumer tests, contract checks and full-source comparison                                            |
| Commit an improvement   | `pnpm run quality:baseline:prune`                | Validated removal or reduction of existing allowances                                                 |
| Keep native correctness | `pnpm run lint` / `pnpm run lint:fix`            | Existing native correctness-only gate / repair command                                                |

Replace example paths with maintained files. Reports accept multiple explicit paths. Fixes require at least one file and reject directories, outside paths, symlink aliases, ignored files and arbitrary Oxlint options before changing any source. Only Oxlint's `--fix` category is exposed; dangerous and suggestion fixes are not enabled. Review the source diff after fixing. A successful selected-file command does not replace the full gate.

VS Code keeps shared diagnostics and formatting, but does not apply lint fixes on save during this migration. Use the deliberate selected-file command: inserting readability spacing can increase physical-line metrics in files that already exceed their budget.

```sh
pnpm run validate:quality
pnpm run lint
pnpm run format:check
```

`validate:quality` runs real consumer fixtures, verifies shared imports/toolchain/CI wiring, then checks the actual source report. PR CI also compares the checked-in allowances with the PR base through `QUALITY_BASE_SHA`; manually increasing the committed baseline cannot make new findings pass.

Report commands return success for readable reports even when they contain debt or regressions. Check/fix commands fail on regressions. Parser, configuration, selection and tool failures remain nonzero; parser failures retain the original message and location. The JSON form is intended for automation; `--silent` removes pnpm's own banner.

Hosted checks add a job summary with totals, regressions, leading rule/file groups and pruning opportunities. Counts distinguish the shape of the debt; they are not a bug count or one combined quality score. Use the JSON report for complete groups rather than only the ten leading entries.

## Reduce existing debt

1. Fix an existing finding in its owning source file.
2. Run `pnpm run validate:quality`.
3. Run `pnpm run quality:baseline:prune`.
4. Review and commit only retained or reduced allowances with the source fix.

Pruning checks the current report against the existing budget before writing. CI never regenerates the baseline. The numeric budgets and normalized report comparison remain owned by the shared package.

Successful full checks identify **removed occurrences** and **lowered numeric allowances** separately. Numeric values are sorted within each diagnostic group; these are budget slots, not tracked function identities. Prune and commit the improvement: otherwise the old allowance can admit a later recurrence. A selected-file report does not claim allowances in other files have disappeared. The regression suite exercises improvement → prune → reintroduction for both occurrence counts and numeric metrics.

## Upgrade and move workflow

1. During an authorized update, resolve the newest stable npm `latest` release, inspect its exact peers, engines, integrity and publication source, and record the lookup time. Keep the source revision fixed while comparing the old and proposed provider pins. Save reports outside maintained source and inspect changes by file, rule, normalized message and metric.
2. Install the qualified exact npm version and required peers; update the lockfile through pnpm. Ordinary installs and CI remain frozen. If compatibility or supply-chain policy blocks the latest release, preserve the qualified state and document the blocker, owner and revisit condition. Preserve the original `initial-capture.json` as historical evidence.
3. Run the real consumer tests, full comparison, native correctness gate, formatter and a frozen install. Document the exact revision and results in this file or the change PR.
4. For a file move, first resolve its inherited findings, then move it and prune the old path's allowances. A clean new path passes without carrying debt into a new baseline key.
5. If an upstream message change or unavoidable move requires transferring existing debt, stop the ordinary upgrade and prepare a separate, explicit migration: old/new identity mapping, unchanged source evidence, bounded allowances, owner approval and rejecting tests. The current history guard intentionally rejects new identities; editing both source and baseline is not an approved transfer mechanism.

The shared package owns reusable policy and normalization. This adapter owns this repository's paths, command experience and CI integration. The npm package now exports `code-quality-check` and `code-quality-duplicates`; migrating existing consumer commands to the shared runner remains a separate backlog task requiring installed-package qualification.

### npm adoption on 2026-11-28

- Selected `@servrox/code-quality@0.2.0` from public npm `latest`; published at `2026-11-28T00:00:49Z` from source `651582f77fecf1904bc84787b6d8a9d78394162e`.
- Verified the downloaded tarball's SHA-512 against registry metadata. Inspected publication provenance; no independent signature-chain verification is claimed.
- Compared with the previous Git pin `28e1af8201a2e06692caf1a51c38d8a024899fd2`: the existing presets, formatter, baseline APIs and license are byte-identical. The release adds optional helpers and updates package metadata/documentation.
- Keep `ultracite@8.2.1`, `oxlint@1.93.0`, `oxfmt@0.78.0` and existing consumer commands. Preserve both the initial capture and baseline bytes.
- The exact release-age exception, owner and removal condition are recorded in the [ADR-0080 Guide](../../docs/adrs/0080-consume-shared-code-quality-policy.guide.md#exact-package-and-tool-versions). It does not cover later versions.

## Extensions and review triggers

- Reusable rule, threshold, framework preset or report-normalization fix: change and verify `servrox/code-quality` first; update this consumer's pin and lockfile in a reviewed PR.
- Repository paths, environments, deliberate entrypoints, framework scopes and CI commands: change this repository, with a real rejecting fixture for the affected boundary.
- Revisit migration allowances whenever the shared pin, lint configuration, source scope or wrapper changes; preserve the existing correctness gate.
- Initial or expanded allowances require an explicit reviewed migration. An already adopted repository rejects growth against its PR base; changing that contract requires its own governance and focused tests, not a refresh command.
- Completion: remove resolved allowances, retaining only separately justified bounded exceptions, until the shared report is clean. Do not relabel a nonempty baseline as completed adoption.
