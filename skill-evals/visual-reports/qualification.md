# Visual Reports candidate qualification

Observed on 2026-10-20 in Linux/NixOS under WSL2, with Node.js 24.22.0,
Bun 1.4.2 and pnpm 11.24.0. This records a local candidate for PR #156,
not a published release or universal host qualification.

## Candidate identity

- Base repository revision: `4054fee3858408611ef0b6a8c48e79f4c7a24097`.
- Canonical source: `skills/engineering-workflows/visual-reports/`.
- Canonical, generated portable projection and local installation: 41 files,
  byte-identical after the final update.
- Skill inventory SHA-256:
  `729e1d6f40715112537432cd5f67339e1b81b1f3ee08577816b954b97a67b0ee`.
  Compute it from UTF-8 lines `<file-sha256><two spaces><relative-posix-path>\n`,
  sorted by relative path, for every skill file.
- Generator SHA-256:
  `fc8e59238c4357fe3018ad7a5778e45d3ec01a036fc56448a0eab2afac425b19`.
  A separate rebuild reproduced all four vendor artifacts exactly.
- Portable projection tree hash:
  `3ebd4987c5e99ed7a954a8cdcc1274b12d821e75b18f249aa059fc56f919f020`.

The repository index was left unchanged. Repository checks ran in an isolated
Git fixture built from the candidate's public working files, including new files.
All source bytes were compared with the worktree before and after qualification.
Only official generated projection outputs were copied back. The complete
2,619-file input-inventory document had SHA-256
`439994ddfae6ce1517256b3d3e480796c4014fc8bd7d1818f1b285577b992910`.
This receipt was added after the run and separately format-checked; it changes no
runtime or package input.

## Verified behavior

| Check                 | Observed result                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Skill tests           | 49 passed, 0 failed, 0 skipped                                                                                |
| Compatibility         | All 24 existing recipes; v1 APIs retained                                                                     |
| Selection             | All eight purpose templates × five domain profiles render valid starters                                      |
| Inputs and exports    | JSON/Markdown equivalence, strict unsupported-input diagnostics, HTML/Markdown/JSON from one model            |
| Charts                | Signed scales, zeros, missing values, irregular coordinates, target overshoot and consistent waterfall totals |
| Periods               | Calendar plans and exact UTC intervals; overlapping ranges, equal-instant milestones and unknown progress     |
| Status                | Healthy/degraded/down/unknown samples; known-sample denominator and no time-weighted availability claim       |
| Structure and assets  | Five automatic diagram families, bundled icons, SVG restrictions and reviewed logo digest checks              |
| Managed updates       | Immutable snapshots, exclusive writers, stale-base rejection, export digests and path/symlink guards          |
| Browser file delivery | 25 reports with JavaScript and 25 without; zero standalone network requests                                   |
| Browser interaction   | Keyboard skip link, 390px layout, 200% text at 320px, reduced motion and local editors passed                 |
| Preview               | Actual HTTP route, explicit revision notice/apply, draft protection and details/scroll restoration passed     |
| Browser exceptions    | Zero in the automated delivery run                                                                            |

An independent agent used the installed instructions to create a fictional
release-status report and a second managed version. Both versions and all three
exports remained readable, with changed latency/recommendation and preserved
unknown observations, costs and sources. The exercise exposed day-only timeline
precision; UTC interval support and two regression tests closed that gap.
Creating a standalone report in an existing output directory was correctly
refused; using the documented new destination succeeded.

The final installed CLI produced another managed report containing intraday
overlap and a reviewed official Node.js logo. Its served HTML returned HTTP 200;
the 390px view had no outer/report horizontal overflow. The original logo fetch
and subsequent cache hit preserved the same 5,844-byte SVG and SHA-256. The logo
was checked against the [official branding page](https://nodejs.org/en/about/branding).
Microsoft Edge opened the actual local preview successfully. The desktop
in-app-browser opening request was queued; its loaded state was not independently
observed.

## Timing

Measured with the seven-section mixed fixture, including automatic diagram layout:

| Measurement                         | Result              |
| ----------------------------------- | ------------------- |
| Separate cold CLI process           | 230.72 ms           |
| Warm render p95, 50 samples         | 6.57 ms             |
| Warm managed update p95, 50 samples | 21.87 ms            |
| Warm acceptance target              | Both below 1,000 ms |

Model generation, research and initial asset retrieval were excluded and remain
unmeasured. These numbers describe this runtime and fixture, not end-to-end
response latency or a guarantee for every report size.

## Repository and packaging checks

All of these completed successfully on the final source snapshot:

```sh
pnpm install --offline --frozen-lockfile
pnpm run sync:agent-plugin
pnpm run generate:traceability
pnpm run format:check
pnpm run lint
pnpm run validate
pnpm run package:agent-plugin
pnpm run package:openai-plugin
pnpm run package:standalone-skills
pnpm run validate:archives
```

The aggregate included catalog, ADR, projection, listing, network-policy,
supply-chain and owning test checks. The site build and SEO validation passed for
52 HTML pages. Existing warnings in unrelated skills remain warnings.
The archive gate independently rebuilt and checked portable, OpenAI, Claude and
11 standalone packages.

| Candidate archive | SHA-256                                                            |
| ----------------- | ------------------------------------------------------------------ |
| Portable          | `2eddca8b5e18bfc470a73a6016fc6deb995c5f7913bf54e7718c24edcc8b53c4` |
| OpenAI            | `ccdb80979a0cb8209c21f024508d8e4c9dd3eab04368c3fa095b658bdfa04eff` |
| Claude            | `bb2dabc7ee43a716b78c2947599840b0c0d16b65218c9bc65cc7fdf6160f1418` |

## Boundaries and handoff

The prior local installation was backed up and verified before atomic replacement.
It remains recoverable. This is an uncommitted development installation; existing
committed, digest-pinned consumer bundles were not silently upgraded.

Native `claude plugin validate` remains a manual merge acceptance gate. Fresh
native discovery/activation on every target host, platform submission, clinical
benefit and WCAG conformance were not qualified by these checks.
No user-repository staging, commit, push, merge or publication occurred.
Knowledge reconciliation remains pending because the local start check reported
`needs_setup` with a connection conflict and no adopted project policy; no content
was uploaded.

See [public admission](public-admission.json), the
[skill](../../skills/engineering-workflows/visual-reports/SKILL.md) and accepted
ADRs
[ADR-0073](../../docs/adrs/0073-bundle-visual-report-generator-dependencies.short.md) ([Long, canonical](../../docs/adrs/0073-bundle-visual-report-generator-dependencies.long.md) · [Guide](../../docs/adrs/0073-bundle-visual-report-generator-dependencies.guide.md)),
[ADR-0074](../../docs/adrs/0074-use-one-versioned-visual-report-model.short.md) ([Long, canonical](../../docs/adrs/0074-use-one-versioned-visual-report-model.long.md) · [Guide](../../docs/adrs/0074-use-one-versioned-visual-report-model.guide.md)) and
[ADR-0075](../../docs/adrs/0075-version-local-visual-reports-atomically.short.md) ([Long, canonical](../../docs/adrs/0075-version-local-visual-reports-atomically.long.md) · [Guide](../../docs/adrs/0075-version-local-visual-reports-atomically.guide.md)).
