# Jev capability advisor evaluation

This evaluation records the public release candidate and clearly separates current qualification from earlier prototypes. Offline checks establish local behavior; they do not establish native host-loading speed or production routing accuracy.

## Native supplement and public comparison, 2026-09-23

The [four-variant evidence](benchmarks/native-session-2026-09-23.json) combines 288 existing Jev Session, Jev Fresh Connection and published Hussi chooser observations with **96 new native turns**. All use the same 48 frozen tasks (40 skill, eight NONE), twice, and byte-identical 132-entry catalog. The native adapter receives the same 128 physical candidate cards, task and routing rules as Jev. Golden labels are excluded. The seven current runtime source hashes still match the original freeze; no Jev calls were repeated.

| Variant              | Skill median | Skill p95 | Correct accepted selections | NONE correct | Errors |
| -------------------- | -----------: | --------: | --------------------------: | -----------: | -----: |
| Jev Session          |      0.733 s |   0.798 s |                       80/80 |        16/16 |      0 |
| Hussi9               |      0.884 s |   0.936 s |                       76/80 |        16/16 |      0 |
| Jev Fresh Connection |      1.108 s |   1.167 s |                       80/80 |        16/16 |      0 |
| Native               |      4.314 s |   6.323 s |                       80/80 |        16/16 |      0 |

Primary statistics include every one of the 80 positive observations per arm, not only correct selections; the 16 NONE observations are secondary. P95 uses nearest rank. The default website factor is 5.89×, the ratio of native and session medians. These are **separate measurement runs**, not a contemporaneous randomized four-arm experiment or causal latency estimate. Provider caching/load are uncontrolled. The modified Hussi persistent-transport control from the original experiment remains disclosed in the data and benchmark README; no universal speed ranking is claimed.

Native requested `gpt-6-astra`, reasoning `low`, using Codex CLI 0.154.0. Its resolved backend identity was not independently observable. Jev-based variants used `jev-1.13.0`. The unchanged native adapter measures local selection preparation plus `turn.started` to `turn.completed`; CLI process startup is retained separately. Native ran sequentially with a 90-second deadline, no tools/plugins/skills/memory/user configuration and no harness retries. CLI-internal transport behavior is not equated with a physical HTTP-request count. All failures, timeouts and missing timings remain explicit in the evidence.

Independent audits verify the 197 original and 211 native frozen files, exact payload/prompt parity, schedule, strict scoring, timing events and complete ledgers. The [published Hussi chooser](https://github.com/hussi9/skill-router/blob/652953a0cbb423d4bb7f62de83db15ad4ca9b16e/scripts/jev_choose.py) retains its original payload, 1.2-second timeout and 0.8 confidence gate; this does not measure its full router, hooks or fallback execution.

The cumulative development count is now **6,546 executions**: historical 6,450 plus these 96 native observations. The 288 reused observations were already counted and are not added twice. Counts describe recorded executions, not unique tasks, passing tests or calls. Original evidence below is preserved with its original date and scope.

### Technical differences audit

The [short technical comparison](../../docs/skills/jev-capability-advisor/benchmarks/README.md#why-routing-speeds-differ) is shared with the Astro page. A post-hoc audit of the original frozen observations clarifies its scope:

- **One call each:** all 96 observations in each of the Hussi9, Jev Fresh Connection and Jev Session arms used exactly one API call. Optional compound follow-ups do not explain this study's timing difference.
- **Smaller requests, less local preparation:** the published Hussi chooser had lower medians for both on the 80 positive observations. Request timing also includes network/TLS, provider processing, decoding and evidence writing; it is not pure model latency. No controlled ablation isolates each contribution to the overall gap.
- **Four abstentions:** Hussi9's raw choices matched the expected skills, but confidence values of 0.71, 0.75, 0.77 and 0.78 were below its 0.8 routing threshold. Two tasks each repeated twice account for the four withheld suggestions. The published 76/80 counts correct accepted selections, not raw skill recognition; its downstream fallback was not measured.

The audit is recorded in the [comparison data](benchmarks/native-session-2026-09-23.json). It reuses archived observations, makes no new API calls and adds nothing to the benchmark execution count. Both implementations validate returned option IDs. Jev additionally checks consistency across its mode and selection answers; removing a confidence gate alone does not establish better recognition or general routing quality.

## Reusable session qualification, 2026-09-22

The actual `AdvisorSession.recommend` API was frozen before 48 previously unused tasks were dispatched. Forty single-skill and eight no-match tasks, balanced between German and English, ran twice per variant in randomized order. The complete four-variant study contains 384 observations; [this public projection](benchmarks/session-2026-09-22.json) presents the 192 observations from our own fresh-connection and reusable-session paths.

| Measure                        |     Jev session | Jev fresh connection |
| ------------------------------ | --------------: | -------------------: |
| Complete results, all outcomes |           96/96 |                96/96 |
| Single-skill results           |           80/80 |                80/80 |
| No-match results               |           16/16 |                16/16 |
| Single-skill median / p95      | 0.733 / 0.798 s |      1.108 / 1.167 s |
| All-outcome median / p95       | 0.730 / 0.798 s |      1.104 / 1.169 s |

The ratio of positive-task medians is 1.512×, a 33.882% latency reduction. The median paired saving is 376.355 ms, with a predeclared 10,000-draw task-cluster bootstrap 95% interval of 364.723–384.468 ms. Repetitions remain together within resampled tasks. Both paths retain every scheduled outcome; no case regresses against the fresh-connection path. This interval describes this bounded experiment, not deployment-wide variation.

The session path received a fresh catalog per task, with session/client construction, validation, preparation, selection and summary inside the timer. It retained one owner-bound HTTPS connection per repetition: two cold first calls and 94 reused calls, all included. The fresh path opened 96 connections. Neither path used prewarming, result/index caches or retries. Imports and one-time setup were outside the timer; request/response evidence recording was inside. Provider service load and caching were uncontrolled. An independent auditor verified all 197 frozen artifacts, exact serialized requests, decoded responses, attempt ledgers, scoring, lifecycle and timer boundaries. Original HTTP response-body bytes were not exposed by the client.

The seven runtime source hashes and all test hashes are recorded in the linked data. The original 18 selection-policy functions and four helper modules remain unchanged; connection lifetime and strict session frames are the new behavior. All 133 offline tests passed before the freeze. This holdout contains no fresh MCP, compound or clarification tasks; their existing evidence retains its original scope.

A separate live NDJSON CLI smoke used two sequential synthetic tasks with a refreshed skill catalog and then tool catalog. Both selected the expected ID with exactly two API calls in one retained process/socket. EOF exited cleanly with no stderr, remaining children or bytecode writes. An empty catalog worked offline with a missing key file and zero requests. All seven runtime files matched the frozen candidate. This verifies CLI operation, not native-hook activation or another speed comparison.

The benefit requires a long-lived process and direct HTTPS; configured proxies use the unpooled fallback. No automatic native hook, eligible-inventory export, task-completion gain or production promotion is established by this study. [Session integration](../../skills/skill-maintenance/jev-capability-advisor/references/session-integration.md) documents the explicit opt-in contract and outer host deadline. The accepted [ADR-0057](../../docs/adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.short.md) ([Long, canonical](../../docs/adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) · [Guide](../../docs/adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.guide.md)) permits a qualified adapter; current native eligibility exports remain incomplete.

The [audited count ledger](benchmarks/development-counts-2026-09-22.json) adds 4,418 executions from 37 completed experiments to the earlier 2,032, for **6,450 recorded benchmark executions**. Repeated tasks, baseline/candidate variants and failures count; warmups, follow-up calls, rescorings and unit assertions do not count separately. This is development effort across revisions, not unique tasks, passing tests or a census of every exploratory call. Two included HTTP timeouts lack provider-usage responses. The ledger keeps 4,613 new API attempts separate from executions and avoids raw task/catalog data.

## Earlier matched native selector comparison, 2026-09-22

The pre-session optimized runtime was compared with a native language-model selector on all 80 existing release regressions, with identical initial task/card/rule strings and frozen labels. This is regression evidence, not a fresh holdout or a host-workflow test.

| Measure                     |     Jev advisor |  Native selector |
| --------------------------- | --------------: | ---------------: |
| Strict complete results     |           70/80 |            72/80 |
| Single skill / single tool  |   20/20 / 18/20 |    20/20 / 18/20 |
| No match / clarification    |   10/10 / 10/10 |    10/10 / 10/10 |
| Compound results            |           12/20 |            14/20 |
| Selection median / p95      | 1.216 / 3.465 s | 5.725 / 12.331 s |
| Runtime or transport errors |               0 |                0 |

The ratio of selection medians is **4.709×**; the median paired native/Jev ratio is **4.192×**, with a predeclared 10,000-resample 95% paired bootstrap interval of **3.707–4.575×**. The 70 tasks correct in both arms have medians 1.211/5.481 s (4.527×). The 20 compound tasks have medians 2.410/6.650 s (2.759×). All measured failures remain in the full-corpus timing and quality denominators; the both-correct subset is conditional on observed outcomes. These intervals describe this fixed corpus and one observation per arm/task, not deployment-wide uncertainty.

Shared retrieval covered every required group on 52/60 positive tasks and 78/87 required groups. Eight tasks were therefore already constrained by missing candidates. Jev's two additional misses were compounds with sufficient candidates. Wrong or additional selections occurred in eight Jev cases versus six native cases; those counts overlap missing-capability failures. An independently implemented one-to-one scorer agrees on all 160 rows. Secondary scoring with preverified whole-bundle aliases changes no result. The earlier 72/80 Jev result below is a separate observation; it must not replace this run's 70/80.

The frozen experiment used 40 German, 30 English and ten mixed-language tasks, 718 catalog records, the same 240 ordered cards per task, randomized task/arm order, concurrency one and no local decision/index cache. There were **106 Jev requests, 80 native turns, zero retries, zero unexpected tool executions and zero remaining process groups**. Sixty-one Jev tasks used one call, twelve used two and seven used three. Native reasoning effort was low; backend model resolution was not independently observable. Neither arm loaded or executed a selected capability. Jev retains conditioned follow-ups; the native adapter returns a complete set in one turn.

Jev timing covers the complete advisor call, including preparation, HTTP requests and local receipt accounting. Native selection covers preparation plus the observed model turn, excluding process startup; complete process times remain separately identified in the aggregates. Provider-side caching and general service load were uncontrolled. The five runtime module hashes match the tested optimization. Input and code-map parity, request/response hashes, ledger counts, model event timings, process cleanup and frozen source closure were checked independently. All p95 values use nearest rank.

A preceding 16-case pilot scored 14/16 in both arms, with medians 1.243/6.122 s (4.926× ratio of medians; 3.653× median paired ratio), 22 Jev requests and 16 native turns. All sixteen tasks were German and overlap the 80 regressions. Keep the experiments separate; their union contains 80 unique tasks. No universal sixfold speedup, full-host latency improvement or production promotion follows from these selector measurements.

## Public candidate qualification, 2026-09-22

The [usage guide](../../docs/skills/jev-capability-advisor/README.md) stays separate from the [benchmark overview](../../docs/skills/jev-capability-advisor/benchmarks/README.md) and the website’s visual benchmark component. Both benchmark presentations use the counts and measurements below. [Sanitized machine-readable aggregates](benchmarks/2026-09-22.json) retain counts, latency distributions, methods and source identity without raw local catalogs, private source paths or receipts.

- **133 offline tests pass** on Python 3.14.7/Linux. The session revision adds 50 checks for connection reuse, fresh inventory, safe outputs and coverage, deadline accounting, no POST replay, ownership and cleanup. The previous 83-test revision covers Unicode/identifier parity and real compact CLI output, including complete late description conditions, credential-free cache hits, invalid catalogs and provisional/error boundaries. Earlier regressions retain incomplete follow-up advice as provisional, preserve the remaining capability under reversed choice order, safely fall back from an overflowing cached timestamp, and preserve uncached advice when secure POSIX cache primitives are unavailable.
- **270 retrieval cases in four frozen arms:** 50 development, 140 regression and 80 fresh cases. Balanced allocation gains four required groups with no losses overall; metadata provides no additional required-group recall on this set. Current/raw reproduces 140/140 earlier initial payloads, code maps and candidate order. Retrieval presence is not semantic selection quality.
- **Latest retrieval optimization: 80 fresh-process measurements** (40 per arm): median preparation/request 120.54 → 78.41 ms (34.95% reduction), complete worker process 167.06 → 125.20 ms. All 40 ordered payload pairs match. Another 1,080 comparisons (270 existing tasks × two catalog variants × two policies), all 1,112,064 Unicode scalar values and 5,000 seeded mixed strings match the baseline. No provider calls, ranking changes or cache-validation shortcuts.
- **Integrated archived replay:** all 100 terminal outcomes (including the two existing errors), all 153 request payloads and ordered code maps, and all response hashes remain identical. This includes 53 conditioned follow-ups. Existing semantic evidence retains its original scope; no fresh model-quality claim is made.
- **Compact output:** across 100 archived results, median rendered JSON is 287,767 → 1,901 bytes (99.3% smaller), including complete selected descriptions. Outcomes and provenance remain identical. Output bytes are not model tokens or measured native workflow time.
- **Earlier 320 local performance measurements:** 40 fresh processes per configuration and measurement scope. Median complete preparation improves 159.54 to 120.13 ms without caching; validated warm index 115.94 ms; first index creation 206.60 ms. All measured candidates and relevant payloads match the baseline. This measures the preceding runtime including the follow-up correction and cache timestamp fix; it does not measure a provider or native loading.
- **Live evaluation before the follow-up correction:** both frozen arms score 63/80 strictly, including 20/20 single-skill, 18/20 single-tool, 10/10 no-capability and 10/10 clarification tasks, but only 5/20 compounds. Exactly 206 attempts, zero retries and zero provider/parse errors. Balanced plus metadata loses one previously correct case and gains one, with higher median latency; it stays experimental.
- **Native/install evidence:** four bounded Codex scenarios and a separate final-document Inspect exercised real skill reads and offline CLI behavior. The standalone install smoke passed for the frozen candidate; all ten installed files matched source and all five Python modules were present. These are installation/activation observations, not fresh model-quality or native-speed comparisons.

The live weakness triggered a phase-specific follow-up correction. Initial request bytes and mappings remain identical for all 80 repeated inputs; follow-up prompts intentionally change. STOP and CLARIFY stay fail-closed, and the limit remains three requests. **The earlier correction study scored:** 72/80 regression tasks (previously 63/80; nine gains, no lost strict successes) and 16/20 separately frozen fresh compound tasks. Regression compounds improve from 5/20 to 14/20. Fresh pairs score 10/10, triples 6/10; skill-only compounds 10/10, compounds involving tools 6/10. A second permutation-based scorer independently agrees on all 180 old/new rows.

The corrected run made 153 requests with no retries: 107 for regression, 46 for fresh tasks. Together with the earlier 206 attempts, these two experiments made 359 requests. There were two inconsistent-initial-choice errors, both in the fresh set, and no HTTP/transport errors. All four fresh failures omitted a required retrieval group. Among regression failures, extra selected IDs increased from three across two cases to eight across seven cases. This remains a material limitation despite the strict-score gain.

Median/p95 complete helper latency is 1,292.465/3,514.698 ms for regression and 2,425.975/3,641.231 ms for fresh compounds. The corrected run used concurrency one rather than two, with one trial per task; it establishes neither a causal latency improvement nor a model-variability-controlled prompt effect. The twenty new tasks are compound-only. Separate old and current results, untouched labels, source/input fingerprints and request ledgers were independently checked; raw provenance stays local.

A pre-optimization native Inspect turn on its frozen ten-file skill closure read both instructions and contract and executed the real offline CLI. Three enabled candidates were returned, the disabled entry was excluded, all six commands passed, zero TypeSafe requests occurred and no owned process remained. This qualifies that Inspect revision only.

Pre-optimization standalone installation passed for its ten-file skill closure, with byte-for-byte equality, all five Python modules present, installed help and offline inspection working, and zero network attempts. The repository smoke also passed its seven installations and exact eleven-skill listing. The overall snapshot includes earlier documentation and is not presented as the final commit identity.
The standalone format is portable; earlier explicit on-demand behavior was qualified in Codex only. The new session runtime has separate SDK and CLI evidence; automatic native interception remains unqualified. The OpenAI plugin routes this skill to CODEX, not CHAT. The maintained runtime needs Python 3.10+ and no third-party Python packages; actual minimum-version execution and other native hosts remain unqualified. The repository gate is `pnpm run validate:jev`, included in the release aggregate. Optional POSIX caches fall back to uncached execution when their secure primitives are unavailable.

## Promotion gate

**Release preparation is not production promotion.** [ADR-0008](../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.short.md) ([Long, canonical](../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.long.md) · [Guide](../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.guide.md)) requires demonstrated agent-quality improvement, correct activation, practical utility and acceptable maintenance cost. Technical packaging and passing fixtures alone do not satisfy it.

The native utility pilot compared six predeclared regression tasks in twelve paired Codex turns. Both native discovery and the host using archived advisor responses achieved 6/6 strict results and 9/9 required groups, without extra selections. Median process time was 15.64 s natively and 20.47 s with advice; command counts were 12 and 20. The host repaired both incomplete archived compound suggestions. All six replays were hash-verified; no TypeSafe calls occurred. This is evidence of retained host control, but **no measured quality improvement or workflow speed gain**. The pilot is small, uses existing tasks, excludes fresh provider latency, and predates the follow-up correction.

A subsequent twelve-turn A/B compared the previous advisor workflow with compact output, with identical corrected response replay and the same requested native model configuration. Both scored 6/6. Helper calls fell 12→6 and median emitted helper bytes 528,722→1,512, but native turn median rose 25.134→26.535 s (process median 25.999→27.549 s). Reported native input tokens, including cached input, fell 599,882→487,965 (18.7%); no billing inference is made. The median paired ratio was 1.036; this small mixed timing result supports no speed claim. All twelve read the contract and five compact turns redundantly reread selected metadata. All commands passed, no replay internals were inspected, no TypeSafe call occurred and no process group remained. The final prose revision addresses those repeated reads; the A/B is evidence for its preceding frozen instruction snapshot, not a speed qualification of that final revision.

The earlier pre-session instruction snapshot passed two predeclared native workflow smoke tasks (one atomic, one compound): both correct, one helper call and two shell commands each, full local receipts plus compact output, no contract/catalog rereads, no replay-internal reads, zero TypeSafe calls and no remaining processes. All seven operational source files matched the frozen snapshot. That standalone install also passed: all ten files matched source and each of the three freshly rebuilt archive formats; installed help, offline inspection and injected-response summary behavior succeeded without network access. These checks confirm activation and packaging for that earlier snapshot, not a new timing or quality advantage.

Production promotion remains open until a predeclared, representative native comparison demonstrates a useful agent-quality improvement, and the remaining compound retrieval/selection limits are acceptable for the declared scope. The implementation, proposed public catalog, plugin integration and site changes can be reviewed together in a draft; they must not be described as a completed production release. Existing single-task outcomes remain useful selection evidence, not proof of added value over the native host.

Maintenance ownership remains with the repository maintainers. Runtime tests require only Python's standard library, and provider calls follow an explicit experiment scope and recorded resource limits. Recheck host catalog contracts, provider behavior and the evidence scope when changing the selection prompt, retrieval policy or supported hosts. Retire the website's New highlight with the next featured skill or the next catalog release after promotion.

## Offline regression suite

Run from the repository root with Python 3.10 or newer:

```sh
python3 -B -m unittest discover -s skill-evals/jev-capability-advisor -p 'test_*.py' -v
```

The original 44 tests use synthetic capability catalogs and injected responses. They exercise complete single/pair/triple recommendations, conditioned follow-ups, premature stop, distinct none/clarify/error outcomes, malformed replies, bounded requests, alias identity, shared candidate context, disabled records, retrieval capacity, provider fairness, deterministic order, credential-free receipts, HTTP failures, and offline CLI isolation. Cache tests cover full-query/context/catalog/model/rules invalidation, persistence through the real CLI without a key, expiry, corruption including deeply nested JSON, private files, bounded eviction, zero fresh usage on hits, and exclusion of errors/incomplete plans. Alias tests cover complete bundle proof, explicit original IDs, shared-name copies, differing restrictions, and tools that must remain distinct. Confidence tests preserve advisory semantics and reject nonfinite response data. They do not test model judgment.

## Runtime extension, 2026-09-22

This earlier runtime revision had 68 offline tests. The original 44 checks remain, with public-skill-first path resolution and complete runtime-module copying in isolated CLI fixtures. New checks cover the singleton alias fastpath, exact legacy request digests without routing fields, positive/negative metadata separation, model-card bounds and provenance exclusion, explicit balanced allocation, both cache identities, validated lexical snapshots, corruption with recomputed digests, invalid types/ranges/duplicates/nonfinite values, file ownership and symlink protection, directory/write fallback, bounded eviction, real concurrent processes, query-specific alias representatives, and opt-in offline index I/O. The new index-cache tests are explicitly skipped where POSIX primitives are unavailable; uncached behavior has a separate fallback check. The complete suite was executed on Linux only.

All 68 tests passed for that revision in the Linux development environment. A separate offline roundtrip used the existing 718-entry catalog and three generic queries under each policy. Cold, warm and uncached candidate lists, order and model request bytes matched exactly. No provider request, API key, or new held-out labels were used for this runtime check. It establishes mechanical parity, not semantic accuracy or a performance gain. The historical live results below do not qualify this extended implementation; current policy remains the default pending independent quality and live gates.

## Cache and alias revision, 2026-09-22

All 44 repository tests pass. A separate evaluator ran 32 fresh synthetic checks against the integrated files, covering compound-cache invalidation, changed host/metadata scope, original alias selection, large duplicate catalogs, corrupt cache entries, and credential-lazy CLI behavior. Those checks made zero API calls. Independent code review found a shared-display-name ambiguity; the fix and regression tests were verified before live testing.

Three previously evaluated skill tasks were replayed live against a frozen 718-entry catalog enriched with locally verified whole-package fingerprints. Four duplicate entries consolidated into 714 distinct capabilities. The 240 retrieved representatives covered 244 original IDs. All three live recommendations were correct and each used one API request. The real CLI then repeated all three with a nonexistent key-file path: all were cache hits, preserved the selected ID, and made zero requests with no new provider usage.

An independent offline comparison of all 75 positive regression tasks found unchanged retrieval coverage: 71/75 complete cases and 87/91 required groups, with no previously covered cases or groups lost. Four requests still lack a required candidate. Both representative-only and alias-inclusive accounting give the same result; this is candidate coverage, not new semantic-selection accuracy.

| Observation, three regression tasks | Median   |
| ----------------------------------- | -------- |
| Fresh recommendation                | 1,344 ms |
| Cached recommendation               | 180 ms   |

These are helper-selection times; Python process startup, catalog/query file loading and host loading are not included. Cached calls still rebuild local retrieval to validate the current candidate context. The three selected regression cases do not establish overall accuracy or a universal latency gain. This revision has **not** rerun the full 100-case semantic evaluation; the earlier 96/100 result below belongs to the earlier code. No confidence threshold was lowered or calibrated.

Frozen runtime SHA-256: advisor `fa12f2802c8873d791b1370063c4abff983cc0eb98e7cbb4a57fbddcd45522c8`, retrieval `77f84b5a6c98f75c3c8e8a9c256f11ee53dedf8a061fe4424094a2ae745ffbb7`, cache `19d8204cfffeca483c782d503bfc59e3735841b09ebd1c15a44d04294e834c11`. Raw provider receipts, source/package manifests and independent audit details remain local under ADR-0030. These three attempts exhausted the remaining previously approved API budget; no additional live evaluation or retry occurred.

## Earlier routing baseline — historical evidence

The local comparison uses 50 development cases and 100 independently authored and reviewed held-out cases. The new set contains 30 skill requests, 30 tool requests, 15 compound requests, 15 requests needing no capability, and 10 ambiguous requests. Language coverage is 45 German, 45 English, and 10 mixed cases. Labels were reviewed and frozen before the optimized implementation inspected them.

The snapshot contains 718 available capabilities, including 132 skills. Local catalogs, synthetic queries tied to that inventory, and raw provider receipts stay outside the repository. This follows ADR-0030's separation between portable tests and local runtime evidence. Independent held-out labels have SHA-256 `1dc1131be140e2b71460e57f55b251b5825003f8638ef41f48e9d659c5bbd992`.

### Offline observation, 2026-09-22

| Set                               | Earlier 30-card retrieval: all required groups available | Revised 240-card retrieval: all required groups available |
| --------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Development: 45 positive requests | 42/45                                                    | 45/45                                                     |
| Held out: 75 positive requests    | 65/75                                                    | 71/75                                                     |

Held-out required-group coverage improved from 81/91 to 87/91. Seven requests gained complete candidate coverage; one previously covered request lost it. Four requests remain incomplete. The larger shortlist is a quality/resource tradeoff, not a faster lexical search: median held-out search time was about 1.24 ms before and 3.93 ms after, with indexes already built. The CLI also builds an index on each invocation.

These are retrieval results only. Candidate presence does not prove Jev selects the right result or avoids unnecessary recommendations. No-capability and clarification quality require semantic evaluation and are excluded from these positive-retrieval denominators.

### Live comparison, 2026-09-22

Both versions ran on all 100 new cases after explicit authorization for the metadata transfer. The 90 cases supported by both versions form the direct comparison; the 10 clarification cases exercise a new output state and are reported separately.

| Metric                                    | Previous version | Revised version |
| ----------------------------------------- | ---------------- | --------------- |
| Exact result, 90 shared-contract cases    | 71/90 (78.9%)    | 86/90 (95.6%)   |
| Unnecessary selected IDs, same 90 cases   | 14               | 2               |
| No-capability cases correctly recognized  | 15/15            | 15/15           |
| Median recommendation time, same 90 cases | 1.02 s           | 1.34 s          |
| Clarification cases                       | Unsupported      | 10/10           |
| Exact result, revised extended contract   | Not comparable   | 96/100          |

The revised pipeline improves exact selection by 16.7 percentage points on the common contract, at approximately 31% greater median recommendation latency. Its four held-out failures coincide with missing required candidates. Two cases return an incomplete clarification outcome; two select an incorrect alternative. None is counted as success. The new pipeline eliminates duplicate rank decisions structurally, but semantic equivalence still depends on model judgment and host review.

On the original development set, exact selection increased from 39/50 to 49/50. Those results are development evidence, not an independent comparison. Neither this improvement nor the held-out result proves native skill-loading or MCP-startup speed. The test set is synthetic and often names providers explicitly; ordinary user tasks may be harder.

The comparison used 271 HTTP attempts: 55 for development, 116 for revised held-out selection, and 100 for the previous version. One additional smoke test invoked the actual packaged CLI with a local key file and native HTTPS transport; it returned the expected recommendation successfully. Total usage was 272 attempts within the approved 320-attempt ceiling. All returned without API/parse errors; no automatic retries occurred. Revised held-out usage was 2,781,800 input tokens versus 1,117,505 for the previous version. The larger candidate context and conditional follow-ups trade additional cost and latency for quality. Both held-out arms ran with concurrency two, sequentially by arm; this is a single-run timing observation, not a randomized latency study.

The engine was frozen at SHA-256 `688ea5a97c6cf29a11075c613592ea910618ee9455bb3b7520ed5a85e0e46678` and retrieval at `77f84b5a6c98f75c3c8e8a9c256f11ee53dedf8a061fe4424094a2ae745ffbb7`. The only code change after initial freezing added offline CLI coverage fields; it did not change retrieval or model requests. No held-out labels or selection logic changed after evaluation. The original live benchmark remains unchanged.

## Historical repository checks

All 44 Python tests, the skill-creator validator, the repository skill validator, and invocation-token checks pass for the cache revision. The documented repository validation scripts ran directly through the existing Bun runtime. The `pnpm run validate:skills` wrapper produced no output and was interrupted; it is not counted as a passing command. No dependencies or toolchains were installed. The complete repository aggregate is outside this internal skill's changed contract.
