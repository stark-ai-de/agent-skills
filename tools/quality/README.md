# Shared quality migration

Owner: repository maintainers, under [ADR-0080](../../docs/adrs/0080-consume-shared-code-quality-policy.short.md) ([Long, canonical](../../docs/adrs/0080-consume-shared-code-quality-policy.long.md) · [Guide](../../docs/adrs/0080-consume-shared-code-quality-policy.guide.md)).

This is a partial migration of existing source. A passing baseline gate means no new or increased findings against the reviewed allowance; it does not mean zero lint findings.

## Initial adoption

- Base source: `2267cbcab9605e5f0612abde34d83ec7a85ecbce`.
- Initial capture: real Node-owned Oxlint command in `scripts/quality/report.mjs`, using the candidate's shared package pin, config and source scope.
- Shared source and versions: exact Git commit and peers in `package.json`; resolved archive and integrity in `pnpm-lock.yaml`.
- Baseline: `lint-baseline.json`, generated through the provider's `normalizeLint` and `createBaseline` helpers from source paths already present at the base revision.
- New quality orchestration, configurations and governance test: no initial allowance.
- Coverage: maintained JavaScript/TypeScript under the roots in `scripts/quality/scope.mjs`, including the separate review-video authoring workspace; generated/vendor/invalid-fixture exclusions remain explicit there.
- Preserved protection: the existing `pnpm run lint` correctness gate remains blocking alongside the shared migration gate.
- Exact capture counts and digest: `initial-capture.json`. It describes this initial migration, not future pruned baselines.

## Daily commands

```sh
pnpm run validate:quality
pnpm run lint
pnpm run format:check
```

`validate:quality` runs real consumer fixtures, verifies shared imports/toolchain/CI wiring, then checks the actual source report. PR CI also compares the checked-in allowances with the PR base through `QUALITY_BASE_SHA`; manually increasing the committed baseline cannot make new findings pass.

## Reduce existing debt

1. Fix an existing finding in its owning source file.
2. Run `pnpm run validate:quality`.
3. Run `pnpm run quality:baseline:prune`.
4. Review and commit only retained or reduced allowances with the source fix.

Pruning checks the current report against the existing budget before writing. CI never regenerates the baseline. The numeric budgets and normalized report comparison remain owned by the shared package.

## Extensions and review triggers

- Reusable rule, threshold, framework preset or report-normalization fix: change and verify `servrox/code-quality` first; update this consumer's pin and lockfile in a reviewed PR.
- Repository paths, environments, deliberate entrypoints, framework scopes and CI commands: change this repository, with a real rejecting fixture for the affected boundary.
- Revisit migration allowances whenever the shared pin, lint configuration, source scope or wrapper changes; preserve the existing correctness gate.
- Initial or expanded allowances require an explicit reviewed migration. An already adopted repository rejects growth against its PR base; changing that contract requires its own governance and focused tests, not a refresh command.
- Completion: remove resolved allowances, retaining only separately justified bounded exceptions, until the shared report is clean. Do not relabel a nonempty baseline as completed adoption.
