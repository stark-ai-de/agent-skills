# change-impact evaluation

This synthetic corpus evaluates whether semantic prioritization helps a coding
agent find omitted follow-up changes. It contains eight pilot cases and four
held-out cases. Each group has equal numbers of incomplete and complete changes.
Twelve unchanged background documents per case keep the corpus larger than the
maximum of ten candidates an agent may investigate deeply.

`cases.json` contains complete before/after file snapshots, neutral task prompts,
and source-backed behavior contracts. `expected.json` is a separate grader-only
answer key. Both are maintainer evaluation assets, never installed skill content.
The cases contain invented public-safe content and require no dependencies.
English and German artifacts exercise wording changes across languages.

## Preparation and isolation

Run from the repository root:

```bash
pnpm run eval:change-impact -- prepare --case case-01 --output /tmp/change-impact-case-01
```

`prepare` deliberately creates a new disposable fixture repository and writes its
files, `task.json`, and `packet.json`. Its Git snapshots preserve the before/after
comparison without changing the source repository's index. Use a fresh output
location for each preparation; source repositories are never fixture destinations.

Launch each evaluation agent with only the prepared repository, the task and
contract packet, and its assigned workflow instructions. Do not expose this
folder, the answer key, another arm's findings, or the author's reasoning. The
prepared packet must omit expected findings, exclusions, outcome labels, and the
pilot/holdout designation. Reviewers who read the answer key must not run the
blind evaluation. File isolation also needs an isolated agent context; copying a
fixture does not erase answers from an existing conversation.

Before any run, an independent reviewer validates and freezes the answer key.
Finish prompt/workflow development on pilot cases before releasing held-out
cases. The held-out files are available to maintainers; holding them back is an
evaluation protocol, not a claim that repository readers cannot access them.

## Three matched arms

- `ordinary`: coding agent with its usual tools and no new workflow.
- `host`: change-impact workflow with the host agent prioritizing candidates.
- `jev`: the same workflow with Jev prioritizing those candidates.

Use fresh contexts, the same fixture revisions and behavioral task, and a maximum
of ten deeply investigated candidates per arm. Host and Jev must receive identical
contracts and candidate inventories. Count mandatory investigations toward that
limit too; ranking cannot suppress known dependencies or explicit requirements.
Record any budget that prevents an otherwise required investigation.

Once the external-processing scope and bounded request budget are authorized,
provide `TYPESAFE_API_KEY` in the environment and obtain a live ranking:

```bash
pnpm run eval:change-impact -- rank --input /tmp/change-impact-case-01/packet.json --output /tmp/change-impact-case-01/jev-ranking.json --live
```

A ranking is input to an agent investigation, not a confirmed finding or a
completed comparison arm. The command does not perform the agent's follow-up
review. Keep live provider requests, retries, cost, and model version within the
pilot's total limit of 100 requests, including any later held-out runs.

## Capture and compare

Capture one JSON record per case and arm in a dedicated directory. The capture
interface is:

```json
{
  "schemaVersion": 1,
  "caseId": "case-01",
  "caseDigest": "case-digest-from-task-json",
  "arm": "host",
  "snapshotDigest": "digest-from-the-prepared-packet",
  "findings": [],
  "reviewedCandidates": 0,
  "investigatedPaths": [],
  "metrics": {
    "elapsedMs": 0,
    "modelCostUsd": null,
    "inputTokens": null,
    "outputTokens": null
  },
  "provenance": {
    "runner": "actual-runner-identifier",
    "model": "actual-host-model",
    "kind": "live"
  }
}
```

Each finding has `contractId`, repository-relative `path`, an exact source
`quote`, and `rationale`. Populate the example with measured values and actual
provenance; zero values above are schema illustrations, not captured evidence.
Unknown costs or tokens stay `null`, never zero. A synthetic or mocked run uses
`kind: "mock"` and cannot establish effectiveness. Jev captures must additionally
retain actual ranking provenance and include its costs in total workflow costs.

```bash
pnpm run eval:change-impact -- compare --runs /tmp/change-impact-captures
```

Before a comparison can advance, provenance must include `independentlyGraded`
and `matchedProtocol` set by the independent evaluator, a common `protocolDigest`
for the host model/settings and shared workflow, and matching `candidateDigest`
values for host/Jev inventories. Jev captures include a `ranking` receipt with
model, status, snapshot digest and complete usage. Every finding must refer to an
investigated path. A mechanical true positive requires its exact quote to contain
the reference anchor; alternative evidence needs separate human adjudication.
Unknown full-workflow cost prevents advancement even when counts improve.

Store `provider-ledger.json` beside the capture files with
`{ "schemaVersion": 1, "complete": true, "additionalAttempts": 0 }`, replacing zero
with the measured number of provider attempts not already represented by retained
Jev captures. Include discarded, failed and qualification calls. The comparator
sums captured attempts across both splits plus this ledger; missing/incomplete
accounting or a total above 100 prevents advancement. Do not set `complete` when
unrecorded attempts may exist.

Apply the [rubric](rubric.md) to the collected findings and comparison report.
Missing arms, unknown required metrics, differing snapshots or inventories, and
unreviewed labels prevent an adoption conclusion. Neither an offline validator
nor a successful live ranking proves that the skill improves agent performance.

## Fixture checks

All `.mjs` files are runnable with Node. Programs under `checks/` are deliberately
small behavioral witnesses, not complete application suites. Every before
snapshot passes its included checks. Two after snapshots intentionally retain a
stale boundary/default assertion; identifying that obsolete assertion is the
correct follow-up. The remaining included checks pass after the change, even
where a different artifact is stale. Do not label those intentional failures as
fixture infrastructure errors or automatically update snapshots.

The corpus covers forgotten imports, defaults, configuration units, user-facing
copy, boundary assertions, and amount formatting. Negative controls cover
historical descriptions, distinct domains, synchronized generated content, and
already-updated consumers. It is a small synthetic pilot, not evidence of broad
real-repository reliability or a provider quality ranking.

## Recorded runs

- [2026-09-22 live synthetic pilot](runs/2026-09-22/README.md): 24 matched
  investigations, equal finding quality, no demonstrated incremental Jev benefit;
  full workflow costs unknown and held-out runs not started.
- [2026-09-22 operational qualification](runs/2026-09-22-operational/README.md):
  installed CLI, fresh multi-batch agent reviews, bounded failure handling and a
  public repository witness. This is separate from the comparative adoption gate.

## Operational qualification

`operational-cases.json` adds three independently checked cases with 48 background
documents each: two simultaneous contracts with four omissions, a clean domain
boundary case, and Unicode normalization with two omissions. The grader-only
`operational-expected.json` includes exact anchors and negative controls.
These cases are neither the old pilot nor its held-out split. Do not feed them to
the pilot comparator or use operational success to advance the adoption rubric.

```bash
pnpm run eval:change-impact -- prepare --suite operational --case op-17 --output /tmp/change-impact-op-17
```

Install the candidate into that fixture using its setup instructions, verify the
installed bytes, and rank through the installed CLI. Keep the answer key and
other runs outside each fresh host context. Review in at least two actual queue
batches of six pairs, carrying confirmations forward, with twelve total deep
investigations. Run the installed report helper and retain its pending coverage.
An independent evaluator must verify findings, exact quotes, actual queue/report
execution, source integrity, installation identity and activation limitations.

The separate historical public-repository witness requires its exact Git objects
to be present locally and never fetches them:

```bash
node scripts/validation/change-impact/real-repository-witness.mjs
```

It runs eight dependency-free assertions against two historical helper revisions.
It is explicitly invoked, not part of the offline aggregate or a full repository
test suite. Before any real-source provider run, establish processing authority
and source scope. Record every attempt in the shared task ledger.
