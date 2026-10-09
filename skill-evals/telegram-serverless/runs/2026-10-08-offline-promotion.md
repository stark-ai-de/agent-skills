# Offline qualification and promotion assessment

Historical evidence for the pre-review candidate. The 2026-10-09 review found an incorrect offline-status classification and an unhandled Mini App SDK precondition failure; the original trials did not exercise the failing browser states. See the [scoped review-fix assessment](2026-10-09-review-fixes.md) for the corrected payload and current checks. Existing hashes, archives and trial outputs below retain their original subject.

Reviewed: 2026-10-08 UTC (2026-10-09 Europe/Berlin). Decision: promote telegram-serverless 0.1.0 under [ADR-0006](../../../docs/adrs/0006-use-incubator-outside-public-catalog.short.md) ([Long, canonical](../../../docs/adrs/0006-use-incubator-outside-public-catalog.long.md) · [Guide](../../../docs/adrs/0006-use-incubator-outside-public-catalog.guide.md)) and [ADR-0008](../../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.short.md) ([Long, canonical](../../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.long.md) · [Guide](../../../docs/adrs/0008-promote-skills-by-quality-utility-and-maintenance-fit.guide.md)). Integration checks are recorded separately; this is not publication or live Telegram qualification.

## Method

Four independent evaluator agents received the same synthetic cases and access to a temporary capture of the complete official Serverless page. Two baseline agents could not read the candidate, rubric, or other responses. Two candidate agents additionally read the skill and selected references, but could not read the rubric or baseline. Build and operations cases used separate agents. The operations agents later handled O10/O11 with their own earlier context retained and no assessment feedback.

Each arm produced text responses, proposed file contents, and commands with effects and executed:false. Agents were prohibited from network access, installation, Telegram operations, and repository mutations. The implementing assistant reviewed these actual outputs against the prewritten rubric and ran local syntax checks. This is an author-reviewed, single-sample comparison, not a blinded human review or a statistically powered benchmark. Model build and sampling settings were not separately pinned.

Artifacts:

- [Candidate build](candidate-build.json), [operations](candidate-operations.json), [routing](candidate-routing.json).
- [Baseline build](baseline-build.json), [operations](baseline-operations.json), [routing](baseline-routing.json).
- [Local syntax/JSON checks](syntax-checks.json).
- [Incubator fingerprint](candidate-fingerprint.json), [public fingerprint](promoted-fingerprint.json).
- [Cases](../cases.json), [rubric](../rubric.md), [source/version review](../source-review.md).

Private workspace paths were replaced with repository-relative paths. The temporary documentation filename was replaced with a descriptive source label. Responses, generated code, and proposed effects were preserved; the raw documentation is not redistributed.

## Observed outcomes

| Cases                          | Candidate | Baseline                          | Evidence                                                                                                                 |
| ------------------------------ | --------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| B1 persistent bot              | Pass      | Pass                              | Awaited atomic per-chat counter, text-only guard, correct Message payload, schema/migration/consumer sequencing          |
| B2 private notes Mini App      | Pass      | Pass                              | Both endpoints bind ownership to server context; bounded nonempty input, plain HTML callback API and safe text rendering |
| B3 faulty backend review       | Pass      | Pass                              | Rejects npm/Node/Buffer, unsupported foreign keys, missing .js and await, and client-provided owner identity             |
| O1 offline test                | Pass      | Pass                              | Remote run and synthetic context are explicitly separated from offline checks and authenticated requests                 |
| O2 migration outcomes          | Pass      | Pass                              | --yes includes warnings; skipped/manual work survives successful exit; no unattended destructive workaround              |
| O3 concurrent deployment       | Pass      | Pass                              | Preserves local and remote changes; fetch is not a merge; no force/reset/pull shortcut or full-mirror deletion           |
| O4 frontend publication review | Pass      | Pass                              | Stale build, caching, iframe headers, static:false removal and unmanagement distinction                                  |
| O5 options only                | Pass      | Skill inventory unavailable       | Candidate lists all eight ordered routes; baseline honestly offers only a documentation overview; neither executes       |
| O6 webhook/upgrade diagnosis   | Pass      | Pass                              | Retains queued updates, distinguishes no-op body from empty module, previews local upgrade without redeploying           |
| O7 other hosting               | Pass      | Pass                              | Keeps Cloudflare and rejects irrelevant tgcloud migration                                                                |
| O8 bare invocation             | Pass      | Skill inventory unavailable       | Candidate exposes complete inventory; baseline asks for missing skill; neither infers work                               |
| O9 unsupported assumptions     | Pass      | Pass                              | No invented runtime secrets, transactions, or backup command                                                             |
| O10 undecided outcome          | Pass      | Scope-safe, inventory unavailable | Candidate lists all eight options; baseline offers three task choices; both wait for scope                               |
| O11 explicit setup explanation | Pass      | Pass                              | Official local CLI/init/login instructions, separate private token, preserved frontend, no execution                     |

All 14 candidate cases satisfy the applicable rubric with no observed critical failure. Both arms pass the 11 shared platform-correctness cases. The three inventory cases test the skill's own routing contract; lack of that inventory is not counted as a platform error in the baseline.

Local Node parsing passed for six generated JavaScript artifacts per arm, including inline browser code. Both supplied JSONC configurations parse as strict JSON and refer to their supplied public/index.html. Five JavaScript examples and one JSON example in the skill also parse. No SDK imports, database operations, UI interactions, or platform authentication were executed by these checks.

## Quality, utility, and maintenance judgment

The clearest practical improvement appears in B2: after an unconfirmed note-save request, the candidate says to reload notes before retrying, while the baseline says to try again. The candidate better preserves uncertainty around a non-idempotent write. This is a narrow robustness observation, not an additional baseline rubric failure or a measured delivery guarantee.

The candidate also provides a stable complete menu and announces the selected route for clear tasks, while preserving review-only and instructions-only scope. This improves consistent workflow selection across setup, authoring, data, and operations. Neither arm invented cloud success.

The baseline is strong. These trials do not demonstrate a general correctness uplift, lower latency, or token savings. Reported source-byte estimates are approximate and not tokenizer measurements: build baseline 66,788 versus candidate 85,579; operations baseline 45,226 versus candidate 88,766. The candidate read more material. Routing follow-ups reused context, so their read estimates are not independent costs.

This is a high-value provider-specific workflow: persistent bots and authenticated Mini Apps combine code, data, frontend publication, concurrency, and live operational effects. Six focused references and a complete authoritative section map keep that scope maintainable. The payload has no custom emulator, deployment wrapper, runtime dependency, or executable helper to maintain. Changes to CLI flags, SDK contracts, endpoint identity, or static hosting require source refresh and rerunning affected cases.

On that limited evidence, the workflow-consistency and write-retry improvement, correct scope boundaries, full lifecycle utility, and bounded maintenance cost satisfy promotion. Strong baseline results and absent live proof remain explicit limits.

## Promotion boundary

The candidate was authored and evaluated in incubation. Promotion moved the folder to skills/engineering-workflows/telegram-serverless and removed only metadata.internal. All other runtime bytes matched the evaluated fingerprint at promotion. The public fingerprint records the resulting payload. The shared CHAT/CODEX starter prompt is portable as explicitly approved by the maintainer; Codex invocation examples retain $telegram-serverless.

After promotion, repository oxfmt normalized table padding, code fences, example quotes and wrapping. The implementing assistant reviewed that formatting diff, reran example syntax/JSON checks and refreshed the public fingerprint; canonical OpenAI metadata and icon bytes did not change. Semantic revisions invalidate affected trial evidence and require reevaluation. Evaluation inputs, outputs, source dates, version findings and this assessment remain outside the runtime payload under ADR-0007.

## Unverified

Live bot delivery; authenticated Mini App calls and rejection behavior; database/migration effects; hosting and Telegram Web embedding; cloud synchronization; webhook repair; runtime secrets, transactions, quotas and backups; hosted CI; public plugin discovery and invocation; publication and installation from a published release. No bot, credential, cloud resource, or production data was used.
