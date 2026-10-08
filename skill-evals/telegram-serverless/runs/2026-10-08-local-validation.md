# Local integration validation

Checkpoint: 2026-10-08 UTC, before the explicit staging instruction.

The source diff has been reviewed by the implementing assistant. It adds telegram-serverless 0.1.0 and plugin membership/version 1.8.0, updates catalog/install/listing/service disclosures, and adds offline evidence. Root package version, lockfile, Release Please manifest and changelog are unchanged. The approved spec is ignored and local-only.

## Passed

- pnpm run validate:skills: 12 public skills and 25 incubator skills; invocation-token and interviewer metadata fixtures pass. Existing warnings concern older skills, not the Telegram addition.
- pnpm run validate:bundles: eight explicit bundled skills and bundle contract fixtures pass.
- pnpm run validate:openai-listing: canonical listing and routing metadata pass.
- node scripts/validation/test-openai-documentation.mjs: documentation drift fixtures pass.
- pnpm run lint: repository script lint passes.
- pnpm run list: telegram-serverless is discoverable in the public catalog.
- pnpm run smoke:install: 12 public skills discovered from a temporary Git-derived candidate copy; Telegram installs at the expected Codex, Cursor and Claude Code destinations. Existing smoke cases also pass. The installer was skills 1.5.23, as pinned by the owning script; no global skill installation occurred.
- pnpm run validate:site: owning build checks pass; 47 static pages built and SEO validated, including the Telegram skill page.
- pnpm run release:manage -- impact --kind minor: reports minor catalog impact and leaves root version ownership with Release Please.
- pnpm run release:intent -- --base-ref HEAD: feature contract passes for plugin 1.7.5 to 1.8.0. Repeat after staging so the new skill is included in Git diff evidence.
- git diff --check: passes.
- All 56 official page section anchors are covered; local runtime reference links resolve.
- Original and formatted runtime examples parse; both trial arms' generated JavaScript and configuration parse. See syntax-checks.json.
- Both trial arms retain 14 actual responses; all proposed cloud commands remain unexecuted. See the separate promotion assessment.

The smoke candidate fingerprint at this checkpoint was sha256:3adccd5c18ef32c929d97dace67047c84765a8afcc3ed3471859bb154bc26062, with 2,252 candidate files. It predates this receipt and the final fingerprint documentation update; it is not a final package identity.

## Staging-dependent checks

- pnpm run validate:release-descriptor: the descriptor itself is valid at 1.8.0; its release-input fixture stops at SEC-001 because the ten new canonical skill files are untracked. The suite is not passed.
- pnpm run validate:plugin-evals: the inventory validates nine positive and six negative cases; the marketplace fixture stops at the same untracked-input gate. The suite is not passed.
- pnpm run validate:network-endpoints: stops at the same untracked-input gate. No exception was added to bypass it.
- pnpm run sync:agent-plugin, full projection and OpenAI metadata/icon/archive checks, and reproducibility remain pending the explicit staging instruction.

No alternative Git index was created, no files were staged, and generated projection files were not hand-edited. After the reviewed canonical files are explicitly staged, generate portable projections and disposable OpenAI packaging, rerun the blocked owning checks, inspect the resulting diff and record the results here.

## Limits

These checks establish local authoring, catalog, packaging-source and installation behavior only. Hosted CI, directory discovery, publication, bot delivery, endpoint authentication, database effects and deployed Mini App behavior remain unverified. The installation smoke uses local candidate files, not a published release. No actual Telegram operation was performed.

Environment: NixOS in WSL2, native Linux worktree and tools; Node 24.21.0, Bun 1.4.2, pnpm 11.24.0. The release descriptor retains its declared Node 24.18.0 and Bun 1.4.0 pins. Initial sandboxed pnpm attempts could not open the managed engine-store lock; scoped reruns with the permitted worktree/tool access completed.
