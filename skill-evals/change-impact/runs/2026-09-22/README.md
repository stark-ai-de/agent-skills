# Live synthetic pilot — 2026-09-22

The implementation works with the live Jev API. This pilot does **not** establish
an incremental benefit from Jev or justify promotion out of the incubator.

| Arm                         | Cases | Confirmed omissions | False positives | Deep investigations |
| --------------------------- | ----: | ------------------: | --------------: | ------------------: |
| Ordinary agent              |     8 |               7 / 7 |               0 |                  59 |
| Change-impact, host ranking |     8 |               7 / 7 |               0 |                  36 |
| Change-impact, Jev ranking  |     8 |               7 / 7 |               0 |                  42 |

All seven reference omissions were collected. The four clean pilot cases stayed
clean in all arms. Jev found no additional omission over host ranking and used
six more self-reported deep investigations. Full workflow dollar costs are
unknown, so the economic criterion cannot be evaluated. The machine decision is
`inconclusive-cost`; no advancement criterion is demonstrated. The four held-out
cases were not run, because there was no qualifying pilot result to confirm.

## Execution and evidence

The 24 retained investigations used fresh `codex exec` contexts with the same
configured `gpt-6-astra` model, `ultra` reasoning, read-only sandbox, response
schema and ten-artifact investigation limit. Configured MCP servers were disabled
identically. Execution order rotated by case, with four concurrent processes.
The complete shared candidate inventory and source-backed contracts were given
to both workflow arms; only the Jev arm also received the provider ranking.
The ordinary arm received the task and exact before/after revisions. The graders'
answer key and other arms' findings were withheld from these contexts.

- [Independent grading](grading.md) records semantic and provenance checks.
- [Protocol](protocol.json) records the common configuration.
- [Fixture identity](fixture-identity.json) binds source and independently reviewed
  reference data. Case-10's output unit was clarified before blind runs.
- [Captures](captures/) retain all findings, source quotes, investigated paths,
  model/settings, source and candidate identities, timing and token observations.
- [Rankings](rankings/) retain the live advisory judgments, including low-ranked
  candidates, pinned provider model, usage and coverage.
- [Comparison](comparison.json) is reproducible with the command below.
- [Example report](example-report.json) exercises the actual report CLI using a
  live ranking and two source-grounded host findings. Its `incomplete` status
  correctly preserves the fourteen candidate pairs not confirmed in that report.

```bash
pnpm run eval:change-impact -- compare --runs skill-evals/change-impact/runs/2026-09-22/captures
```

The self-reported investigation counts are the predeclared effort proxy, not a
measurement of reasoning operations. Wall time includes CLI startup and shared
machine contention. Fixed model settings and fresh contexts reduce some sources
of bias, but one synthetic trial per arm does not measure variance or generalize
to a large real repository. Fixture authoring, integration diagnosis, grading and
qualification runs are outside retained per-arm timings and are described here;
those timings must not be called complete project delivery cost.

## Provider qualification and accounting

The pinned model was `jev-1.13.0`. Eight accepted requests evaluated all 128
contract/candidate pairs, using 37,716 input tokens. Their estimated input-token
cost at the checked $0.042/M rate is $0.001584072. This is provider-only known
usage, not an invoice or full workflow cost.

Two earlier case-03 qualification requests returned rounded probabilities with a
sum of 0.99 and were rejected by the original validator. The documented API says
probabilities sum to one. The helper now accepts only the maximum two-decimal
rounding error, retains the original probabilities and rejects larger deviations.
This is a recorded response deviation, not a change to the semantic ranking
rubric or reference findings. A regression test covers it.

The [provider ledger](captures/provider-ledger.json) includes those two excluded
attempts: **10 total attempts**, within the shared limit of 100, with no HTTP
retries. Usage was retained for one of the rejected attempts; the other has
unknown usage. Consequently the cost of all ten attempts is not fully known.
Provider output-token counts were not retained for cases 01/02 by the first
helper version, so the corresponding complete output-token totals stay null.
Host and provider token counts are separated in captures. All complete workflow
USD costs remain null rather than being estimated from an unrelated tariff.

One preliminary ordinary case-01 smoke run is excluded. One Jev case-03 host run
used the earlier incomplete ranking and was discarded and repeated with the valid
ranking. Two Jev jobs encountered an absent ranking before starting a host
process and were subsequently run. No failed or incomplete provider result is
presented as an accepted comparison arm. The three replacement jobs ran after
the main batch; this is an additional timing limitation.

## Local implementation validation

The focused validator passes 27 offline checks under Node and Bun, including
source identity, stale packets, secret/path exclusions, bounded collection,
provider schema/rounding/timeout/retry failures, source-grounded reporting,
comparison integrity, and the shared 100/101-request boundary across both splits.
Skill validation, script validation, validation ownership, runtime ownership,
formatting and lint were also checked locally. These checks are distinct from
the live comparison and do not establish hosted CI or public-plugin qualification.
