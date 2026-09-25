# Jev capability advisor evaluation

This evaluation records the public release candidate and clearly separates current qualification from earlier prototypes. Offline checks establish local behavior; they do not establish native host-loading speed or production routing accuracy.

## Native next-skill supplement, 2026-09-24

**Measured source snapshot:** these observations belong to [the recorded runtime revision](https://github.com/stark-ai-de/agent-skills/tree/a4a8512dd8ebb55abb26650e08af38f301cea064/skills/skill-maintenance/jev-capability-advisor/scripts). Current catalog-validation and alias-punctuation fixes are outside that snapshot and have not been live rebenchmarked. The figures do not qualify the changed runtime. The site compares all seven current runtime files with the receipt hashes and displays any difference alongside the measurements; the observation reports and their source identities remain unchanged.

The new Native arm reuses exactly the frozen independent `next-skill-hidden32` inputs: **32 tasks × two repetitions**, with **48 skill and 16 NONE observations**. Requested model: **gpt-6-luna / medium**, Codex CLI 0.156.1. All **64/64** results are correct, with zero failed selections, timeouts, rejected model requests or tool executions. The existing 192 Jev/Hussi observations are reused; the supplement adds exactly 64 Native observations.

The Skill-only Native median is **3116.3054764765548 ms**, versus Jev Session's **486.6918309999164 ms**: **6.40×** the selection speed. The all-category Native median, **3103.8403404672863 ms**, is not used for the bars. Native’s 16 NONE outcomes remain a separate group. Both Native and Jev achieved **48/48** skill choices; the published Hussi chooser accepted **46/48**. This does not measure skill loading, full-router fallback or complete-task speed.

- **Protocol and timing:** Native rebuilt the exact frozen Jev cards, mapping and one-choice rules before every observation. It used three-digit codes, at most one selection and `additional_work: unassessed`. Preparation plus `turn.started`–`turn.completed` is timed; CLI startup is recorded separately. No harness retries, fallbacks, warmups or Jev API calls.
- **Independent import audit:** reverified all 207 original frozen files and 81 Native input files, all 32 prepared payload/map/prompt identities, and all 64 raw argument lists, events, outputs, scores, timing components and cleanup receipts. The ledger contains exactly 64 dispatches and completions, with no duplicate task/repetition pairs. No remaining process groups were reported.
- **Precision and quantiles:** the original handoff rounded summaries to 0.001 ms and interpolated p95. The published comparison retains raw timing precision and recomputes **nearest-rank p95 for all four arms**. Native skill p95 is therefore **5863.2536529621575 ms**; the original interpolated **5256.864818185565 ms** is preserved as source-reported data, not silently overwritten.
- **Material limits:** Jev/Hussi ran at 10:11–10:13 UTC; Native at 13:33–13:37 UTC on the same date. Service load and provider prefix caching were uncontrolled; 43/64 Native turns reported cached input. The resolved backend identity was not independently exposed. Every process emitted an informational notice about the experimental `skip_host_skill_discovery` setting; all turns subsequently completed successfully. These notices are retained separately from failed selections, with local paths removed.

The [sanitized Native receipt](benchmarks/native-next-skill-2026-09-24.json) includes full-precision per-observation timing, anonymous answer codes, scoring constraints, source hashes, original exported statistics and import-audit binding. Private prompts, inventories, command paths and identifying raw events remain local under ADR-0056. The original Jev/Hussi report and its recorded runtime identities remain unchanged. [Shared current comparison and product features](../../docs/skills/jev-capability-advisor/benchmarks/README.md#current-next-skill-comparison).

## Explicit next-skill qualification, 2026-09-24

**Qualified KPI: lower provider-reported input for selecting one next skill.** The explicit `next_skill` profile scored 80/80 skills + 16/16 NONE on the matched cohort, and 48/48 + 16/16 on independent confirmation. Total skill-selection input fell **6.4% and 6.3%**, respectively, against both published Hussi9 and our pooled-HTTPS Hussi control. Median input also improved in each cohort. The pooled control remains slightly faster; this original three-arm study has no Native arm or complete-agent speed claim. Its separate Native supplement is documented above.

- **Frozen, separate cohorts:** 48 matched tasks and 32 independently authored, previously unexecuted confirmation tasks; two repetitions and three variants. Confirmation began only after the matched gate passed. A separate nine-observation development smoke precedes both. The confirmation author knew earlier diagnostic themes.
- **Complete accounting:** 489/489 scheduled executions and 489 API attempts; no missing observations, errors or unknown usage in these qualified cohorts. No retries, warmup or decision cache. The report retains all outcomes, returned models, timestamps and seven runtime hashes.
- **Comparable selection scope:** same 132-entry catalog, `jev-1.13.0`, concurrency one and randomized order. Published Hussi's pinned chooser retains its 0.8 route threshold and 1.2-second timeout. The pooled control is our unpublished transport modification; whole-router hooks and fallback are excluded.
- **Explicit narrower contract:** one eligible skill or NONE/CLARIFY, at most one call, `status: next_skill` and `additional_work: unassessed`. Enabled tools are rejected before credentials/network; `general` remains the default. No claim that one recommendation covers a compound task.
- **Default-path regression proof:** 116 initial payload checks, 232 historical response replays (343 requests per implementation) and 18 fixtures match the baseline. The 29 incorrect outcomes, including two errors, are preserved. This is deterministic offline parity, not additional live accuracy.
- **Offline review:** 149 existing tests plus 24 new profile contract tests pass. An additional 16-case budget/scope audit passed 15 and reproduced one inherited trailing-period qualified-alias preference failure in baseline and candidate. Host-declared equivalent aliases were involved; no different capability or permission bypass was observed. The current runtime fixes terminal punctuation handling, with an offline regression; the historical 15/16 result remains unchanged.
- **Independent audit:** source, schedule, request/reply, scoring and token ledgers were checked; 23 negative audit cases passed. Both median and total input must beat both comparators on skills and the full cohort, while candidate quality stays perfect. No post-hoc bootstrap or significance claim was added.

[Shared tables and technical differences](../../docs/skills/jev-capability-advisor/benchmarks/README.md#next-skill-input-efficiency) · [Sanitized audited observations](benchmarks/next-skill-2026-09-24.json) · [Rejected development and interruption ledger](benchmarks/optimization-development-2026-09-24.json).

The current next-skill report contains 480 comparison observations and a separate nine-observation development smoke. Offline parity is counted separately. The [optimization ledger](benchmarks/optimization-development-2026-09-24.json) is retained unchanged because the report binds its SHA-256 and campaign metadata. It preserves rejected candidates, a provider refusal and 107 unexecuted slots; these are not passing observations or part of the published selection comparison. Earlier, superseded benchmark reports and cumulative development-count promotion have been removed from the release tree.

## Known limitations

- General compound advice remains experimental. Bounded retrieval can omit necessary candidates, and the host must assess recommendations and remaining work.
- The measured snapshot could lose preference for a qualified alias followed by a terminal period (15/16 supplementary cases passed). The current runtime fixes this while preserving longer dotted identifiers, with offline regression coverage. The original failure remains in the immutable report; the fix is not a new live quality measurement.
- The next-skill profile deliberately leaves additional work unassessed. Its input and latency measurements do not qualify complete-task quality or execution speed.
- Native host activation and authoritative inventory must be qualified per host under ADR-0057. Installation alone does not install automatic interception.

## Promotion gate

**Release preparation is not production promotion.** [ADR-0008](../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.short.md) ([Long, canonical](../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.long.md) · [Guide](../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.guide.md)) requires demonstrated agent-quality improvement, correct activation, practical utility and acceptable maintenance cost. Technical packaging and passing fixtures alone do not satisfy it.

The native utility pilot compared six predeclared regression tasks in twelve paired Codex turns. Both native discovery and the host using archived advisor responses achieved 6/6 strict results and 9/9 required groups, without extra selections. Median process time was 15.64 s natively and 20.47 s with advice; command counts were 12 and 20. The host repaired both incomplete archived compound suggestions. All six replays were hash-verified; no TypeSafe calls occurred. This is evidence of retained host control, but **no measured quality improvement or workflow speed gain**. The pilot is small, uses existing tasks, excludes fresh provider latency, and predates the follow-up correction.

A subsequent twelve-turn A/B compared the previous advisor workflow with compact output, with identical corrected response replay and the same requested native model configuration. Both scored 6/6. Helper calls fell 12→6 and median emitted helper bytes 528,722→1,512, but native turn median rose 25.134→26.535 s (process median 25.999→27.549 s). Reported native input tokens, including cached input, fell 599,882→487,965 (18.7%); no billing inference is made. The median paired ratio was 1.036; this small mixed timing result supports no speed claim. All twelve read the contract and five compact turns redundantly reread selected metadata. All commands passed, no replay internals were inspected, no TypeSafe call occurred and no process group remained. The final prose revision addresses those repeated reads; the A/B is evidence for its preceding frozen instruction snapshot, not a speed qualification of that final revision.

Production promotion remains open until a predeclared, representative native comparison demonstrates a useful agent-quality improvement, and the remaining compound retrieval/selection limits are acceptable for the declared scope. The implementation, proposed public catalog, plugin integration and site changes can be reviewed together in a draft; they must not be described as a completed production release. Existing single-task outcomes remain useful selection evidence, not proof of added value over the native host.

Maintenance ownership remains with the repository maintainers. Runtime tests require only Python's standard library, and provider calls follow an explicit experiment scope and recorded resource limits. Recheck host catalog contracts, provider behavior and the evidence scope when changing the selection prompt, retrieval policy or supported hosts. Retire the website's New highlight with the next featured skill or the next catalog release after promotion.

## Offline regression suite

Run the repository-owned evaluator from the repository root:

```sh
pnpm run validate:jev
```

It uses Python's standard-library unittest runner with synthetic catalogs and injected provider responses. Tests cover input validation, candidate retrieval and aliases, permissions and activation restrictions, single and compound outcomes, strict provider response parsing, cache identity and secure persistence, HTTPS behavior, Session lifecycle, and CLI/NDJSON isolation. No provider key or live model request is needed. These checks establish implementation behavior, not model judgment or production utility.

Validate the public observation reports, source identities, Native supplement, presentation and Markdown tables separately:

```sh
node site/scripts/test-jev-benchmarks.mjs
```

The site build includes this benchmark gate. The retained reports remain dated evidence; passing their consistency checks is not a fresh live benchmark or a production-promotion decision.
