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

| Host        | Platform       | Hook registration/delivery                | Eligible inventory and actual advice/adoption                       |
| ----------- | -------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Codex CLI   | Linux          | Pending live evidence                     | Pending live evidence                                               |
| Codex CLI   | WSL            | Delivery observed; owned hook now removed | Ordered error fallback observed; remote advice/adoption unqualified |
| Codex CLI   | macOS          | Pending live evidence                     | Pending live evidence                                               |
| Codex CLI   | Native Windows | Pending live evidence                     | Pending live evidence                                               |
| Claude Code | Linux          | Pending live evidence                     | Pending live evidence                                               |
| Claude Code | WSL            | Pending live evidence                     | Pending live evidence                                               |
| Claude Code | macOS          | Pending live evidence                     | Pending live evidence                                               |
| Claude Code | Native Windows | Pending live evidence                     | Pending live evidence                                               |

Use isolated host configuration, known skills and harmless MCP tools. Capture catalog entries from that same executing session; do not substitute a second SDK or CLI session. Document verified host defaults, exclusions and bounded/unknown coverage. Use synthetic tasks and retain private source-bound catalog evidence. Record the tested host/Python versions, OS and shell, source hashes, opt-in scope, normal trust review, and sanitized outcomes. Never publish credentials, private prompts, inventories or user paths. A controlled eligible test catalog proves that catalog's flow; it does not establish machine-wide native inventory completeness. Separate credential accessibility from authentication, and recorded evidence from current-session checks. The [private qualification record](../../skills/skill-maintenance/jev-capability-advisor/references/hook-integration.md#record-controlled-qualification) binds host/version, platform, source/registration fingerprints, skill/MCP counts and individual scenario outcomes; matching file/platform records remain historical; status does not execute a host version command, and current-session qualification stays unverified.

1. **Registration and rollback:** preview, install twice, inspect, submit a prompt, then uninstall. Preserve unrelated hooks/settings and later user edits. Verify the configured event actually reaches the agent, rather than only replaying its command. Repeat with user and project scopes; check configuration overrides and host policy/trust blocks.
2. **Task selection:** with qualified current metadata and configured credentials, submit a new actionable task. Use an ordinary blind task without Jev, skill-selection or test instructions. Observe a real bounded `general`/`current` Recommend call before task-specific skill loading, planning or questions, returned IDs checked against the same current inventory, authorized capability use and one status line. A concrete prerequisite failure must instead be reported before native work; historical `not_verified` alone is not a failure reason. A late manual call does not satisfy this order. Follow with “thanks”, an explanation question and a continuation; none should trigger a second consultation. A distinct new task should.
3. **Authority and inventory:** repeat with explicit user skill selection, explicit-only or disabled capabilities, stale/partial/deferred metadata and a Plan-mode write prohibition. Verify documented native defaults only on their applicable host, excluding unknown availability/invocation rules. Keep usable bounded entries and report omissions; if no reliable subset remains, use native fallback. No restriction may be guessed or bypassed, and a recommended capability grants no argument-specific permission.
4. **Failure and cancellation:** exercise missing credentials, configured-file precedence over the environment, unreadable files, malformed private settings, interrupted key-reference updates and explicit recovery, a provider error, the existing advice deadline and cancellation. Verify bounded work, no retry loop, no false successful-advice status and normal host continuation. Separately timeout the five-second static hook; it must not block the user's task. Injected failures must be labeled simulated; unavailable or unexecuted scenarios remain not_run. A cancellation scenario passes only when the intended cancellation and cleanup behavior is actually observed, not merely because an unrelated run was interrupted.
5. **Platforms and launchers:** exercise Python paths containing spaces, apostrophes, Unicode and shell metacharacters. Test Codex native Windows through cmd, PowerShell and Git Bash; test Claude's direct executable form. Record final encoded command lengths and prove clean failure for unsupported launchers. Passing platform fixtures does not replace these host observations.

Run only the hook regression module from the repository root:

```sh
python3 -B -m unittest discover -s skill-evals/jev-capability-advisor -p 'test_hooks*.py' -v
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

These observations predate the September 26 credential/catalog extension and remain bound to the fingerprints below. They are historical evidence, not a qualification of changed guidance or manager code.

Codex CLI 0.157.0 on Linux/WSL, using a separate temporary home and state directory with no credentials, discovered the generated registration through the experimental app-server `hooks/list` method. It reported `eventName: userPromptSubmit`, `source: user`, `timeoutSec: 5`, synchronous execution, no parse errors or warnings, and `trustStatus: untrusted`. Uninstall then removed the owned registration. No trust bypass, agent turn or provider call was used. This proves configuration discovery and preservation of the trust boundary; delivery, agent adoption, eligible inventory and genuine advice remain unqualified.

The local hook tests exercise both command forms as subprocesses on Linux. Separate native Windows execution used Python 3.11.15 and Windows PowerShell 5.1.26100.9492 in temporary Windows directories. After the approved version-controlled-home exception, all 39 hook tests completed: 30 passed, seven POSIX-only home-repository cases skipped, and two symbolic-link cases skipped because that account lacked symlink-creation rights. Windows junction rejection passed. Cmd, PowerShell and Git Bash preserved the emitted JSON, including multilingual guidance; an existing interpreter copied into a path containing spaces, Unicode, apostrophe, percent, dollar, backtick and semicolon also worked. No Windows host application or provider was invoked. macOS, actual agent delivery/adoption and eligible-inventory/advice qualification remain pending; no CI execution is claimed.

PowerShell creates empty profile directories on its first isolated launch even with `-NoProfile`. The tests allow only those empty startup directories, require existing configuration/state to remain unchanged, and verify that subsequent prompt-bearing calls create no runtime state. The emitter itself is separately tested with all file/network access forbidden.

At that revision, the Linux/WSL Jev suite completed 217 tests: 215 passed and two native-Windows cases skipped. The home-repository tests verify real Git exclusion, rejection of already tracked state, preservation of conflicting ignore files, read-only inspection and repair without rewriting a trusted hook command. Local user-scope installation also succeeded and was idempotent; Codex discovered the entry as enabled but untrusted. This still does not prove delivery or automatic consultation.

Source identities for the repeated native Windows observation (SHA-256):

- Manager: `35e508b98c0a0f3c593f5d0cf924fbc1d0d7abf97cf15e80f7a42d3e998db649`
- Guidance: `85a8a9e141cdb834a204b9a251ed893e04591ccf3740171adc78ffad70b426e3`
- Tests: `d5ea7f06de05eb0aad6f1fbb3edfa58280a28d054abbef1e3d72bc6298db486c`

### Credential and catalog follow-up checks — 2026-09-26

At the preceding revision identified below, the implementation completed 236 offline Jev tests on Linux/WSL: 234 passed and two native-Windows cases skipped. Its focused hook suite contained 58 tests, including private key-reference precedence, unreadable files, unchanged sibling settings, interrupted-update recovery, concurrent edits, secret-output protection and historical-evidence handling. Read-only status does not launch a host. File-preservation assertions compare write identity and deliberately exclude access time, which legitimate reads can update.

`validate:skills`, `lint`, `lint:actions`, changed-file formatting and whitespace checks also passed. The official projection generator and `validate:projections` / `validate:plugin-evals` ran against an isolated candidate because the new release inputs were then unstaged. All 1,852 candidate files and executable bits were checked against the working tree; the user's staged entries remained unchanged. These are historical local results for that frozen revision, not current corrected-candidate checks, hosted CI or publication evidence.

The same frozen skill and test files also ran natively on Windows 10.0.26220 with Python 3.11.15 and Windows PowerShell 5.1.26100.9492: 48 passed and 10 skipped (seven POSIX-only home-repository cases and three unavailable symbolic-link privileges). Cmd, PowerShell, Git Bash, junction rejection and hostile interpreter paths passed. All 17 copied fixture files matched before and after execution. No credentials, host configuration or execution-policy changes were needed. This is offline portability evidence; macOS and the hosted CI matrix have not been run for this candidate.

A separately initiated live Codex CLI 0.157.0 probe on WSL used an ephemeral thread, a private fixture working directory and process-local harmless MCP configuration. It retained the existing native approval policy and the already trusted user hook. Native hook notifications independently proved delivery of the **previously installed guidance**, not the changed guidance in this candidate. No trust bypass or global hook update occurred.

The explicitly prompted controlled agent turn used the configured `gpt-6-luna` model with process-local medium reasoning. From its own model-visible metadata it supplied one fixture skill and one MCP tool, with exact IDs and invocation restrictions. A genuine `general/current` advice invocation made one provider request, returned `SINGLE` for the MCP tool, and was followed by that tool's successful execution. Native approval review authorized the bounded advice command. A confirmation turn completed without another consultation or command. This proves the bounded explicit probe's catalog, advice and adoption; it does not prove automatic consultation under the revised hook or exhaustive machine inventory.

Two earlier development attempts remain distinct: an initial max-reasoning probe was interrupted at its time limit after observing delivery and native fixture use, without a provider request; a malformed test catalog omitted IDs, produced `invalid_catalog_item` with zero provider requests, and still continued through native tool selection. Its confirmation also caused no repeated advice. The corrected schema was tested in a separate attempt. These are observed development/fallback results, not simulated provider failures or successful cancellation qualification.

The guidance identified below was subsequently installed and trusted through normal host review; the first blind run below failed automatic consultation. The reapproved ordering/binding revision also failed in a second run; the subsequent skill-path run reached an automatic invocation but failed ordering and transport; the final metadata/permission run demonstrated ordered error fallback but no successful remote recommendation. Disabled/explicit-only policy changes, stale or incomplete metadata, Plan mode, missing-key, provider error, timeout and intended cancellation scenarios remain unqualified at the live-host layer. Claude Code and the other platform combinations likewise remain unqualified. Private raw receipts are retained outside the repository; no private paths, keys or session identifiers are included here.

Frozen implementation identities (SHA-256):

- Integration content: `e037fc5cf4f6bdd2c4e59e4ba04fa24c43859ba2e181a2c721cd9f2b3aa7e7bb`
- Manager: `c5904f0af9f087aa8bdf43b6894cd2119208eec0352346d62c8beb61d291ce22`
- Updated guidance: `c2b5fb32bfef75071c1a5ebc8ebe0a2ed5026d5bda60a9ef32ff3c4456a5bb08`
- Hook tests: `be1de4810652769af0e326b3ba0b0826fdb1ec1e676545f7d81e594ea14b4940`
- Copied Windows fixture aggregate: `49cf9fe6eb0f0795ae4d1726ea92bd04fd5ff2d946400f6da14c9fe59dc6686d`
- Native hash of the older trusted hook used in the explicit live probe: `sha256:c1d5b7469fdbca168c8d0be186056580e3369a86e677166e3e95dc43c64ad7e4`

### Blind automatic consultation runs — 2026-09-26

The runs use Codex CLI 0.157.0 app-server stdio on WSL2/NixOS, `gpt-6-luna` and process-local medium reasoning. The ordinary synthetic prompt asks for an implementation plan for reusable saved filter templates without mentioning Jev, skills or testing. There is no prompt/base capability coaching, precomputed catalog or forced provider wrapper. Configured unrelated MCP servers are disabled only for the process; native local skills and host permissions remain. Private harness/log files are separate from the neutral working directory.

| Run                                        | Observed behavior                                                                                                                                                                             | Result                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1: initial guidance                        | Trusted hook delivered context; the agent loaded Spec Interviewer first, with no Jev status, catalog, provider request or fallback line.                                                      | **Failed automatic consultation.**                                              |
| 2: ordered guidance and bound registration | Trusted hook delivered context; Jev was read before task-specific work, but unsupported missing-file claims caused native continuation. No hook status, catalog or provider request occurred. | **Failed automatic consultation; not a valid prerequisite fallback.**           |
| 3: single-instance installed-path check    | Installed status succeeded and Recommend ran automatically, but full candidate instructions were read first; the attempted request returned `network_error`.                                  | **Failed ordering; no successful provider response.**                           |
| 4: metadata-only preparation               | Recommend ran before task-specific instructions; one request attempt returned `network_error`, followed by truthful native fallback. Both turns completed.                                    | **Ordering/failure fallback observed; remote advice and adoption unqualified.** |

Run 2 searched only the empty workspace for support files and read both the current installed Jev skill and an older plugin copy. It claimed the manager and hook reference were missing without checking their installed paths. Both files actually existed and were readable; an independent harness status check exited zero. The fallback line preceded native Spec Interviewer loading and its surface/Plan-mode question, so ordering improved but its prerequisite diagnosis was false. The captured protocol does not establish why the two skill copies were chosen.

The first two failed runs made zero provider requests. Their confirmation turns made no commands or MCP calls; run 2 repeated the native interviewer's pending Plan-mode question. Neither demonstrates no-repeat-after-advice because neither initial turn obtained advice. No late manual call, replay or explicit earlier advice/adoption probe repairs these automatic failures. Other live negative scenarios and host/platform combinations remain unqualified.

Run 3 reached the installed manager after correcting an invalid user-scope project-root argument. Its catalog contained three skills and two built-in host tools, rather than MCP tools; no catalog-provenance sidecar was recorded. The advisor used `general/current` and the configured key file, attempted one request, returned `network_error` with no selected IDs, and was followed by a truthful fallback without a retry. No successful remote response or native approval-review event was observed. The sandbox had network access disabled, but the exact transport cause was not captured. The full Spec Interviewer body was read before advice, so ordering failed. The first turn reached the 175-second harness deadline and was interrupted; confirmation was not run.

Run 4 completed both turns within the separately declared 300-second per-turn cap, using the same ordinary prompt/model/effort and unchanged advisor limits. It corrected an initial invalid literal `--project-root null` argument for user scope, then prepared a bounded catalog of one host-advertised skill, zero MCP tools and zero built-in tools. No separate provenance/omissions record was written, so this does not establish full eligible-inventory coverage.

The automatic `general/current` invocation preceded the candidate workflow body. It attempted one provider request with caches disabled and returned `network_error`, zero successful provider responses and no selected IDs. No native approval review occurred; sandbox network access was disabled and the exact transport cause was unavailable. The truthful fallback preceded the full Spec Interviewer read and its Plan-mode question. This proves ordered attempted consultation and failure fallback, not successful remote advice or recommendation adoption. The confirmation made zero commands, MCP calls or Jev attempts and only acknowledged the user. The increased harness cap does not repair interrupted run 3 or support a cross-run latency comparison.

Source binding:

- Run 1: integration `e037fc5cf4f6bdd2c4e59e4ba04fa24c43859ba2e181a2c721cd9f2b3aa7e7bb`, registration `928cc23e8297f8150148af609a8c0588cb97fb6e9a1902f4fd7accc993813146`, trusted native definition `sha256:3b054193b76259242f0186bdad9de79d39d822bf4ca3ded682749b39785824ad`. Hook events completed in 23 ms and 20 ms.
- Run 2: integration `49e4d7668ad935ed23a6ecab4eeb828619100c66e90da0e513f81145a05b44b9`, registration `a120ac316ee811e68708f45b864073363ab0bbca428e04a8b0a034973ecfaeac`, trusted native definition `sha256:2ed28ee41d9b6bb3dcca0a8743f805d02e361b89853582dbe0f6e832bbeea426`. Hook events completed in 19 ms and 24 ms.
- Run 3: integration `26ad942793b8a3f800e94371745fa44bbdc86ffd4ed1e25e17141b8ec8dce3f2`; manager, asset and hook trust unchanged from run 2.
- Run 4: integration `affcc3ea469e519c067edc0661912e8492c873d0a8e80f772cf067303e53b8ea`; manager, asset, registration and hook trust were unchanged from run 2. Hook events completed in 21 ms and 19 ms. The compact provider-error summary digest is `162cccb4d3a03dc19cc5c6e55d729829c715d2c94c13652650cab900c1725551`; no raw provider receipt was requested.

Individual event durations prove observed delivery, not a latency benchmark. Raw sessions remain private.

### Corrected ordering and registration binding — 2026-09-26

The ordering/binding candidate identified below completed a focused hook suite of **61 tests**. On Linux/WSL, 58 passed and three native-Windows cases skipped. On native Windows 10.0.26220 with Python 3.11.15 and Windows PowerShell 5.1.26100.9492, 51 passed and 10 skipped: seven POSIX-only home-repository cases and three unavailable symbolic-link privileges. No failures occurred. The native Windows run exercised cmd, Windows PowerShell and Git Bash; fixture sources remained unchanged and the copied manager/guidance matched that candidate. This is offline portability evidence, not host adoption.

The ordering/binding hook was installed and reapproved through native `/hooks` review for the recorded runs. Later skill-path and metadata/permission corrections used the same manager, asset and trusted definition. The owned hook has since been removed through the approved rollback below. No new Claude, macOS or other live-host qualification is claimed.

Direct validation passed on the rebased candidate in its assigned worktree: `validate:jev` completed 239 tests (236 passed, three native-Windows cases skipped); `validate:skills`, `validate:projections`, `validate:plugin-evals`, whole-tree `format:check`, `lint` and `lint:actions` all passed. These checks apply to that rebased candidate and are separate from the earlier isolated-candidate results; they do not claim hosted CI or live-host qualification. The subsequent timestamp correction and final checks are recorded below.

Ordering/binding candidate identities (SHA-256):

- Integration content: `49e4d7668ad935ed23a6ecab4eeb828619100c66e90da0e513f81145a05b44b9`
- Manager: `52bf3e4fd7eae4d711330accac796ed2e08b274df90a3e7bbe9bf9bf44d64fd3`
- Guidance: `a3263ef7b51d3764a9eeaf4445b58deaa5bdb3ec52efd70317bbb371b3828d7c`
- Hook tests: `f7dfcaabbcc8d99a75cc3a0859da1b3385e2367c10913b0b84b90e533f060cb9`
- Copied Windows fixture aggregate: `623429e8056f6f09802d4f237ee6b8fd84e5fc36c1c96a4c91968d466f182f07`
- Reapproved native hook definition: `sha256:2ed28ee41d9b6bb3dcca0a8743f805d02e361b89853582dbe0f6e832bbeea426`

### Rollback and remaining qualification — 2026-09-26

After run 4, the approved rollback removed only the unchanged owned hook. Read-only status reported the registration absent; a fresh native `hooks/list` independently returned zero hooks with no errors or warnings. Sibling configuration and the configured key-file reference were preserved. Private backups and the installed skill remain. Automatic advice is therefore no longer activated by this registration. Successful automatic remote recommendation, adoption, broader Skills+MCP coverage and the outstanding negative scenarios remain unqualified.

The draft pull request's initial CI passed five of six offline portability combinations and all archive-identity checks. Windows/Python 3.14 failed on a filesystem timestamp discrepancy; the ADR check also found companion-link errors. The ADR links were repaired and `validate:adrs` passed locally. The Windows failure was reproduced with official isolated Python 3.14.7: only `st_ctime_ns` differed between path and descriptor queries; creation time, identity, size, modification time and mode agreed. The manager now compares consistent creation time on Windows and preserves POSIX change-time checks. The focused regression covers stable snapshots, preservation of other identity checks and refusal of concurrent POSIX permission changes. This later manager correction has no new live-host qualification.

The final Linux/WSL Jev suite completed **243 tests: 240 passed and three native-Windows cases skipped**. Its hook suite contains 65 tests. `validate:skills`, `validate:projections`, `validate:plugin-evals` and `validate:adrs` passed after the fixes. Whole-tree formatting, script/workflow lint, catalog discovery, smoke fingerprint and install smoke also passed. The final manager and test bytes additionally passed 11 focused tests under native official Python 3.14.7, with one POSIX-only case skipped. The final hosted checks are attached to [PR #102](https://github.com/stark-ai-de/agent-skills/pull/102); portability results remain distinct from live-host qualification.

Final source identities (SHA-256):

- Integration content: `1c7ee92e085783189d3e60372eb48393c70dc59ce1c6a0c7365b90da413a5464`
- Manager: `2bd0dc29ed6b81c0c7fedb01e50ea8c3d3b8dd72bc4651943b3dafe555c5ec05`
- Hook tests: `f5ea7807676b0f6bda9e4cb05c0fc5de411c1db6b18cc27881fd212006983614`

The feature release-impact gate also passed after preparing Jev `0.2.0` and plugin `1.5.0`, with matching listing/archive metadata and generated projections. Release-descriptor, bundle, OpenAI listing, archive and reproducibility checks passed for the prepared versions. The root release files remain unchanged. These version changes do not requalify any earlier live observation.
