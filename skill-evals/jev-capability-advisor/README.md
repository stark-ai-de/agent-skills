# Jev capability advisor evaluation

This evaluation records the accepted public skill scope and separates its evidence from earlier prototypes. Offline checks establish local behavior; they do not establish native host-loading speed or production routing accuracy.

## Release recheck, 2026-09-25

**553/553 new live observations** bind all seven runtime modules to release `0.23.0`, commit `095de174e8eb345b27a726631c6a2215168958df`. The original frozen tasks/catalog were reused; this is not a new blind holdout. No runtime or labels were changed during the campaign.

| Scope                       | Completed |                 Jev correctness | Errors          |
| --------------------------- | --------: | ------------------------------: | --------------- |
| Development check           |         9 |                             9/9 | 0               |
| Matched48 × 2 × 3 variants  |       288 |         80/80 skill; 16/16 NONE | 0               |
| Repeated32 × 2 × 3 variants |       192 |         48/48 skill; 16/16 NONE | 1 Hussi timeout |
| Native32 × 2                |        64 | Native: 48/48 skill; 16/16 NONE | 0               |

**Native: gpt-6-luna / medium, Codex CLI 0.157.0.** Raw skill medians are **3091.701245495642 ms** Native and **481.74582499996177 ms** Jev: **6.42×**. Both score 48/48; their 16 NONE observations are separate. The backend did not expose resolved model identity. Preparation plus model turn excludes process startup, loading and task execution.

The published Hussi chooser scored **45/48**: two abstentions and one timeout. Its median includes failure-return latency; no Hussi selection-speed factor is qualified. The timeout returned after 1,216.581 ms; the transport drained for another 283.259 ms. The late response’s 8,993 input tokens remain counted. Jev uses **6.3% less skill-selection input** than either Hussi arm; the original quality/token gates pass. The pooled control remains slightly faster.

- **Source/input audit:** all 207 repeated-cohort freeze files and 81 Native input files match; all seven runtime hashes equal the release Git objects. Every Native payload, mapping and prompt matches the new Jev freeze.
- **Execution audit:** exactly 489 TypeSafe dispatches and 64 Native turns; no duplicate attempts, warmups, harness retries or model fallback. Every outcome and all provider usage are retained.
- **Native raw audit:** scores recomputed from frozen labels; model-turn times reconstructed from all 64 event pairs; no model/auth rejection, unexpected tool execution or remaining process group. The known `skip_host_skill_discovery` notice is a configuration warning, not a failed model turn. Prefix caching appeared in 45/64 turns and was uncontrolled.
- **Offline evidence:** 178 runtime tests; fresh, source-bound general parity with 116 initial payload checks, 232 replays and 18 fixtures. The replays preserve 29 historical wrong results, including two errors. These checks are not new live observations.
- **Import:** the supplied Native export used a legacy layout despite its schema label. The normalized supplement derives full-precision times, opaque accepted/forbidden codes and nearest-rank p95 from raw results. Source-export and raw-result hashes are retained. The Jev import attaches the fresh parity receipt alongside its audit; live observations stay unchanged.

[Current Jev/Hussi report](benchmarks/next-skill-2026-09-25.json) · [Current Native supplement](benchmarks/native-next-skill-2026-09-25.json) · [Full figures and windows](../../docs/skills/jev-capability-advisor/benchmarks/README.md#current-next-skill-comparison).

## Native next-skill supplement, 2026-09-24

**Historical measured snapshot:** these observations belong to [the earlier runtime revision](https://github.com/stark-ai-de/agent-skills/tree/a4a8512dd8ebb55abb26650e08af38f301cea064/skills/skill-maintenance/jev-capability-advisor/scripts). They remain unchanged. The September 25 release recheck above qualifies the current source separately.

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

The September 24 next-skill report contains 480 comparison observations and a separate nine-observation development smoke. Offline parity is counted separately. The [optimization ledger](benchmarks/optimization-development-2026-09-24.json) is retained unchanged because the report binds its SHA-256 and campaign metadata. It preserves rejected candidates, a provider refusal and 107 unexecuted slots; these are not passing observations or part of the published selection comparison. Earlier, superseded benchmark reports and cumulative development-count promotion have been removed from the release tree.

## Known limitations

- General compound advice remains experimental. Bounded retrieval can omit necessary candidates, and the host must assess recommendations and remaining work.
- The measured snapshot could lose preference for a qualified alias followed by a terminal period (15/16 supplementary cases passed). The current runtime fixes this while preserving longer dotted identifiers, with offline regression coverage. The original failure remains in the immutable September 24 report. The release recheck measures the fixed runtime on previously used tasks; it does not isolate this fix’s live effect.
- The next-skill profile deliberately leaves additional work unassessed. Its input and latency measurements do not qualify complete-task quality or execution speed.
- Native host activation and authoritative inventory must be qualified per host under ADR-0057. Installation alone does not install automatic interception.

## Promotion decision

**Accepted by the maintainer on 2026-09-25 for public catalog promotion and merge after passing checks.** The accepted scope is optional capability advice requested by the user, including natural-language requests, and local candidate inspection. Explicit `next_skill` mode is the measured selection workflow; general compound advice remains experimental. Ordinary tasks retain native selection. This decision does not qualify automatic interception or claim a completed package or plugin-directory publication.

[ADR-0008](../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.short.md) ([Long, canonical](../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.long.md) · [Guide](../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.guide.md)) is applied to that scope as follows:

| Criterion                   | Evidence and acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent-quality improvement   | The recorded next-skill comparison preserves Native's 48/48 correct skill choices and 16/16 correct no-match decisions while reducing median selection time from 3.116 s to 0.487 s. Both Jev/Hussi confirmation cohorts reduce selection input, including 6.3% on independent confirmation. The maintainer accepts more efficient correct selection as an improvement to this advisory subtask; this is not a claim of better final-task accuracy or faster complete tasks.                                                                                                                                       |
| Correct activation          | The [skill workflows](../../skills/skill-maintenance/jev-capability-advisor/SKILL.md) distinguish requested advice, offline inspection and integration work from ordinary tasks. [Plugin scenarios](../stark-ai-developer/manifest.json), installation smoke, packaged offline invocation and 178 runtime tests cover the declared interfaces and restrictions. These are structural, installation and regression evidence; current native Codex invocation remains unqualified in the [runtime matrix](../../docs/runtime-evidence-matrix.json), and automatic host integration still requires ADR-0057 evidence. |
| Broad or high-value use     | Choosing relevant capabilities from a current host-supplied catalog and inspecting candidates locally are useful recurring agent tasks. The maintainer accepts the measured next-skill efficiency and optional inspection workflow as sufficient utility for catalog inclusion. General compound results remain advisory and experimental; the host checks recommendations and remaining work.                                                                                                                                                                                                                     |
| Acceptable maintenance cost | Repository maintainers own the skill. Its Python runtime and offline evaluator use the standard library; bounded requests, explicit provider configuration and regression coverage make this maintenance commitment acceptable. This is a maintainer judgment, not a measured operating-cost claim.                                                                                                                                                                                                                                                                                                                |

This promotion decision used the earlier source-bound measurements. The separate September 25 release recheck above adds current runtime evidence without rewriting the original decision or observations. This scoped acceptance replaces the earlier plan's requirement for a representative whole-workflow comparison before any promotion; ADR-0008 does not prescribe that experiment. The historical pilots below remain visible but do not gate this narrower release. Publication follows the [release handoff](../../docs/skills/jev-capability-advisor/README.md#release-handoff).

Maintenance ownership remains with the repository maintainers. Runtime tests require only Python's standard library, and provider calls follow an explicit experiment scope and recorded resource limits. Recheck host catalog contracts, provider behavior and the evidence scope when changing the selection prompt, retrieval policy or supported hosts. Retire the website's New highlight with the next featured skill or the next catalog release after promotion.

## Historical native-workflow pilots

The native utility pilot compared six predeclared regression tasks in twelve paired Codex turns. Both native discovery and the host using archived advisor responses achieved 6/6 strict results and 9/9 required groups, without extra selections. Median process time was 15.64 s natively and 20.47 s with advice; command counts were 12 and 20. The host repaired both incomplete archived compound suggestions. All six replays were hash-verified; no TypeSafe calls occurred. This is evidence of retained host control, but **no measured quality improvement or workflow speed gain**. The pilot is small, uses existing tasks, excludes fresh provider latency, and predates the follow-up correction.

A subsequent twelve-turn A/B compared the previous advisor workflow with compact output, with identical corrected response replay and the same requested native model configuration. Both scored 6/6. Helper calls fell 12→6 and median emitted helper bytes 528,722→1,512, but native turn median rose 25.134→26.535 s (process median 25.999→27.549 s). Reported native input tokens, including cached input, fell 599,882→487,965 (18.7%); no billing inference is made. The median paired ratio was 1.036; this small mixed timing result supports no speed claim. All twelve read the contract and five compact turns redundantly reread selected metadata. All commands passed, no replay internals were inspected, no TypeSafe call occurred and no process group remained. The final prose revision addresses those repeated reads; the A/B is evidence for its preceding frozen instruction snapshot, not a speed qualification of that final revision.

## Hook integration qualification

The optional [hook integration](../../skills/skill-maintenance/jev-capability-advisor/references/hook-integration.md) adds static agent guidance, not a selector benchmark or a complete native inventory export. Existing release observations above remain bound to their original source and selection scope. They do not qualify these hook paths. The implementation targets below need independent, source-bound evidence before being advertised as qualified automatic advice.

| Host        | Platform       | Hook registration/delivery | Eligible inventory and actual advice/adoption |
| ----------- | -------------- | -------------------------- | --------------------------------------------- |
| Codex CLI   | Linux / WSL    | Pending live evidence      | Pending live evidence                         |
| Codex CLI   | macOS          | Pending live evidence      | Pending live evidence                         |
| Codex CLI   | Native Windows | Pending live evidence      | Pending live evidence                         |
| Claude Code | Linux / WSL    | Pending live evidence      | Pending live evidence                         |
| Claude Code | macOS          | Pending live evidence      | Pending live evidence                         |
| Claude Code | Native Windows | Pending live evidence      | Pending live evidence                         |

Use isolated host configuration and synthetic tasks/catalogs. Record the tested host/Python versions, OS and shell, source hashes, opt-in scope, normal trust review, and sanitized outcomes. Never publish credentials, private prompts, inventories or user paths. A controlled eligible test catalog proves that catalog's flow; it does not establish machine-wide native inventory completeness.

1. **Registration and rollback:** preview, install twice, inspect, submit a prompt, then uninstall. Preserve unrelated hooks/settings and later user edits. Verify the configured event actually reaches the agent, rather than only replaying its command. Repeat with user and project scopes; check configuration overrides and host policy/trust blocks.
2. **Task selection:** with qualified current metadata and configured credentials, submit a new actionable task. Observe a real bounded `general`/`current` Recommend call, returned IDs checked against the same current inventory, authorized capability use and one status line. Follow with “thanks”, an explanation question and a continuation; none should trigger a second consultation. A distinct new task should.
3. **Authority and inventory:** repeat with explicit user skill selection, explicit-only or disabled capabilities, stale/partial/deferred metadata and a Plan-mode write prohibition. No restriction may be guessed or bypassed. Unverifiable eligibility must yield a concrete native fallback; a recommended capability grants no permission.
4. **Failure and cancellation:** remove configured credentials, inject a provider error, exhaust the existing advice deadline and cancel a task. Verify bounded work, no retry loop, no false successful-advice status and normal host continuation. Separately timeout the five-second static hook; it must not block the user's task. A skipped or cancelled observation is not a pass.
5. **Platforms and launchers:** exercise Python paths containing spaces, apostrophes, Unicode and shell metacharacters. Test Codex native Windows through cmd, PowerShell and Git Bash; test Claude's direct executable form. Record final encoded command lengths and prove clean failure for unsupported launchers. Passing platform fixtures does not replace these host observations.

Run only the hook regression module from the repository root:

```sh
python3 -B -m unittest discover -s skill-evals/jev-capability-advisor -p test_hooks.py -v
```

The focused CI matrix runs these offline tests on Linux, macOS and Windows. It exercises configuration ownership, static output and launcher construction without provider keys. The general evaluator below also discovers hook tests. Keep automated regression results, real hook delivery, agent judgment, eligible inventory, fresh provider calls and recommendation adoption as separate evidence; no hook latency or whole-task speed benefit is claimed.

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

### Isolated hook discovery check — 2026-09-25

Codex CLI 0.157.0 on Linux/WSL, using a separate temporary home and state directory with no credentials, discovered the generated registration through the experimental app-server `hooks/list` method. It reported `eventName: userPromptSubmit`, `source: user`, `timeoutSec: 5`, synchronous execution, no parse errors or warnings, and `trustStatus: untrusted`. Uninstall then removed the owned registration. No trust bypass, agent turn or provider call was used. This proves configuration discovery and preservation of the trust boundary; delivery, agent adoption, eligible inventory and genuine advice remain unqualified.

The local hook tests exercise both command forms as subprocesses on Linux. Separate native Windows execution used Python 3.11.15 and Windows PowerShell 5.1.26100.9492 in temporary Windows directories. After the approved version-controlled-home exception, all 39 hook tests completed: 30 passed, seven POSIX-only home-repository cases skipped, and two symbolic-link cases skipped because that account lacked symlink-creation rights. Windows junction rejection passed. Cmd, PowerShell and Git Bash preserved the emitted JSON, including multilingual guidance; an existing interpreter copied into a path containing spaces, Unicode, apostrophe, percent, dollar, backtick and semicolon also worked. No Windows host application or provider was invoked. macOS, actual agent delivery/adoption and eligible-inventory/advice qualification remain pending; no CI execution is claimed.

PowerShell creates empty profile directories on its first isolated launch even with `-NoProfile`. The tests allow only those empty startup directories, require existing configuration/state to remain unchanged, and verify that subsequent prompt-bearing calls create no runtime state. The emitter itself is separately tested with all file/network access forbidden.

The current Linux/WSL Jev suite completed 217 tests: 215 passed and two native-Windows cases skipped. The home-repository tests verify real Git exclusion, rejection of already tracked state, preservation of conflicting ignore files, read-only inspection and repair without rewriting a trusted hook command. Local user-scope installation also succeeded and was idempotent; Codex discovered the entry as enabled but untrusted. This still does not prove delivery or automatic consultation.

Source identities for the repeated native Windows observation (SHA-256):

- Manager: `35e508b98c0a0f3c593f5d0cf924fbc1d0d7abf97cf15e80f7a42d3e998db649`
- Guidance: `85a8a9e141cdb834a204b9a251ed893e04591ccf3740171adc78ffad70b426e3`
- Tests: `d5ea7f06de05eb0aad6f1fbb3edfa58280a28d054abbef1e3d72bc6298db486c`
