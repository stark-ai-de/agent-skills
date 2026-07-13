# 2026-07-12 Reliability Refresh, Amended 2026-07-13

## Scope

Implementation review for `codegraph-ast-grep` `0.2.0` and repository release `0.10.0`. Microsoft SkillOpt optimization was excluded; only the repository's pre-existing SkillOpt setup validator ran through `npm run validate`.

## Deterministic validation

- Skill Creator `quick_validate.py` passed.
- `npm run validate:codegraph-ast-grep` validated the runtime contract, registered 14 scenario cases, verified the captured-behavior manifest and artifact hashes, and machine-regraded 28/28 assertions across four captured outputs.
- `npm run validate` passed all skill, ADR, action, script, CodeGraph, draw.io, SkillOpt setup, Astro build, and SEO checks.
- `pnpm format:check`, `pnpm lint`, `git diff --check`, and `git diff --cached --check` passed.
- `npm run list`, `npx skills@latest add ./skills --list`, and `npm run smoke:install` discovered all 9 public skills.
- Release-intent and release validation passed against current `origin/main`, targeting repository `0.9.1` to `0.10.0` and skill `0.1.3` to `0.2.0`.

## Live tool proof

- Legacy CodeGraph `0.9.7` exposed `init -i` and no `explore` command; legacy ast-grep `0.43.0` exposed no `outline` command. A temporary YAML rule fixture passed on ast-grep `0.43.0`.
- Current CodeGraph `1.4.1` was downloaded to a temporary directory from its exact Linux release asset and verified against the release `SHA256SUMS`. Version, installed help, `explore`, `upgrade --check`, and read-only Codex, Cursor, and Claude configuration rendering passed under an isolated `HOME` with telemetry and update state disabled.
- Current ast-grep `0.44.1` was downloaded to a temporary directory from its exact Linux release asset and verified against the GitHub release digest. Version, `run`, `scan`, `test`, and `outline` passed, including the same YAML rule fixture.
- The first ast-grep archive attempt assumed `unzip`, which was absent. The retry used fail-closed shell handling plus `python -m zipfile -e`; only the corrected successful run is accepted as proof.
- Temporary Codex and Cursor installs through the skills CLI passed. Claude Code's portable manual-copy layout passed; no live Claude CLI was available, so Claude runtime verification was limited to CodeGraph's rendered first-party config plus payload installation.

## Captured behavioral evidence

On 2026-07-13, four fresh `codex exec` turns used the exact prompts and synthetic
fixture facts committed under `behavioral/`. The runtime was Codex CLI `0.144.1`
with model `gpt-5.6-sol`, an ephemeral session, ignored user config/rules, and the
read-only sandbox. Each run used an empty isolated `HOME`; `CODEX_HOME` supplied
authentication separately. The runtime candidate hash was
`702758470c0edc66c129c705955ab700b97dbe737ccc46bdd8f017d43c61acb4`.
The harness permitted read-only access only to the named candidate and its routed
references while prohibiting unrelated workspace inspection, analysis-tool
execution, network access, and writes.

The committed final responses and deterministic regrades show:

- stable-update consent: 7/7 assertions; it itemized guarded CodeGraph and exact ast-grep actions, offered independent choices, separated telemetry/configuration/graph effects, preserved installed-version analysis after a skip, and paused before mutation;
- offline update check: 7/7 assertions; it recorded the offline `DO_NOT_TRACK=1` update state, refused potentially migrating graph queries under strict no-write policy, and bounded the permitted fallback to structural inventory with explicit semantic gaps;
- legacy capability gate: 7/7 assertions; it composed granular legacy capabilities, corroborated graph hypotheses with source and test behavior, did not repeat the declined lookup, and kept project-opening queries gated on a disposable copy or accepted migration risk;
- destructive rewrite boundary: 7/7 assertions; it refused the unreviewed rewrite, identified missing rule/scope/write approvals, protected unrelated changes, and required preview, frozen scope, explicit approval, diff review, and project validation.

`behavioral/manifest.json` records thread identifiers, source-case and artifact
paths, SHA-256 values, and aggregate totals. Each `captured-output.md` is the
final message normalized only by repository Markdown formatting. The JSONL event
stream was manually inspected before accepting each run to confirm candidate and
routed-reference reads plus the absence of disallowed tool actions. Those events
are not committed, so the final-message artifacts alone do not independently
prove those facts. The repository validator recomputes assertions rather than
trusting stored PASS fields.

These are synthetic-fixture, single-run behavior captures. They do not prove live
tool execution, every scenario case, improvement over a baseline, or statistical
reliability. The earlier uncaptured manual forward-test notes were removed because
their result-only prose was not independently regradable.

## Result

The refresh has static contract coverage, live CLI capability evidence, and four
reproducible captured behavior samples with deterministic grades. Broader claims
remain limited by the explicit gaps above; the 14 scenario files are not counted
as 14 passing behavioral runs.
