# codegraph-ast-grep Evals and Captured Behavior

This folder contains the public `codegraph-ast-grep` scenario catalog,
deterministic contract checks, an unchanged historical internal reviewer capture, and
reproducible historical behavioral evidence. It is maintainer evidence, not
installed runtime content.

## Current contract coverage

- The finite public workflows are `setup`, `update`, and `doctor`; there is no recursive `auto` workflow.
- Clear setup/update/broken-state intent announces only the matching workflow without another selection checkpoint.
- Bare or ambiguous invocation exposes all three workflows and asks; an explicit options request also receives the complete inventory without execution.
- Agent-initiated activation can select only read-only `doctor`.
- Doctor never repairs and needs exact-root approval before a graph-opening diagnostic that may migrate generated metadata.
- Setup leads with the benefit of Semantic Code Intelligence and structural search, then idempotently persists repository guidance for automatic CodeGraph semantic scope plus ast-grep CLI structural evidence.
- Update brings stable core tools current without changing their installation provenance, performs required configuration/index/schema migrations, reconnects the client, and verifies readiness.
- Routine semantic exploration, structural search, impact analysis, rule authoring, and reviewed rewrites are internal coding behaviors, not public modes.
- Normal setup excludes the experimental ast-grep MCP server.

Current v0.3.4 routing has source-contract assertions, the maintained scenario catalog, and [six fresh Codex CLI captures](behavioral/v0.3.4-routing/README.md) with 36/36 machine-recomputed routing assertions. The captures cover direct setup/update requests, the canonical Codex starter prompt with clear setup/update additions, the bare starter, and an explicit options request. They use synthetic project facts and a composed starter prompt; they do not prove native Codex UI behavior or a real tool installation. The explicit-options case now has a captured and graded current counterpart. Historical source bytes are preserved in `behavioral-baseline/v0.3.3/` so old evidence can still be independently verified. Current cases are the files named in the deterministic validator. The five cases
under [`behavioral/current-contract/`](behavioral/current-contract/README.md)
bind prompts, reused internal clean-context reviewer outputs, historical
independent gradings, and provenance to the exact v0.3.3 behavioral runtime payload. The
local nonbehavioral refresh retains the 35/35 assertion result and does not claim a
new reviewer or client run. The dated receipt is
[`2026-08-26-v0.3.3-local-nonbehavioral-refresh.md`](runs/2026-08-26-v0.3.3-local-nonbehavioral-refresh.md).

[`legacy-case-lineage.json`](legacy-case-lineage.json) records the explicit
disposition of the nine cases removed from the reviewed HEAD snapshot. Its
byte-locked sources live under
`legacy-case-baseline/1d454f06375f3b74ba506fef54b664a2517674c0/`, outside the installed skill
payload. The owning validator binds the exact deletion set and independent
HEAD SHA-256 values and requires every material legacy behavior bullet to map once
to an existing target heading/marker.

## Dated upstream release check

On 2026-09-30, official releases listed [CodeGraph v1.6.0](https://github.com/colbymchenry/codegraph/releases/tag/v1.6.0) and [ast-grep 0.45.3](https://github.com/ast-grep/ast-grep/releases/tag/0.45.3) as latest stable. The skill resolves an eligible stable version at execution rather than pinning these dated observations. CodeGraph v1.6.0 asks existing projects to run `codegraph index` once after upgrading; the update reference records that required generated-index effect. No local CodeGraph or ast-grep installation or live query is claimed here.

## Captured behavioral suite

[`behavioral/`](behavioral/README.md) also retains four historical Codex final
responses, exact synthetic prompts, capture provenance, artifact hashes, and 28
machine-regraded assertions. That suite proves only the named v0.2.0 candidate
behaviors and remains separate from the v0.3.3 result.

## Deterministic gate

Run:

```bash
pnpm run validate:codegraph-ast-grep
```

The validator checks the installed runtime contract, current scenario structure,
all new and historical source/prompt/output/grading/provenance hashes, the v0.3.4 skill-and-starter-prompt candidate binding, six fresh routing captures with 36/36 assertions, historical runtime-payload
binding, the 5/35/0 independent review result, target-guidance persistence,
provenance-preserving setup/update behavior, doctor authority, current/legacy
command safety, and historical capture integrity. Validation itself is offline:
it does not invoke a reviewer, query the network, or execute CodeGraph/ast-grep.

- [Explicit options request](cases/explicit-options-request.md): complete inventory without execution authority; captured in the new v0.3.4 routing suite.
