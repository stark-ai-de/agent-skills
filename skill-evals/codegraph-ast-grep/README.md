# codegraph-ast-grep Evals and Captured Behavior

This folder contains the public `codegraph-ast-grep` scenario catalog,
deterministic contract checks, a current internal reviewer capture, and
reproducible historical behavioral evidence. It is maintainer evidence, not
installed runtime content.

## Current contract coverage

- The finite public workflows are `setup`, `update`, and `doctor`; there is no recursive `auto` workflow.
- Clear setup/update/broken-state intent selects and announces the matching workflow without another selection checkpoint.
- Bare or ambiguous invocation exposes all three workflows and asks.
- Agent-initiated activation can select only read-only `doctor`.
- Doctor never repairs and needs exact-root approval before a graph-opening diagnostic that may migrate generated metadata.
- Setup leads with the benefit of Semantic Code Intelligence and structural search, then idempotently persists repository guidance for automatic CodeGraph semantic scope plus ast-grep CLI structural evidence.
- Update brings stable core tools current without changing their installation provenance, performs required configuration/index/schema migrations, reconnects the client, and verifies readiness.
- Routine semantic exploration, structural search, impact analysis, rule authoring, and reviewed rewrites are internal coding behaviors, not public modes.
- Normal setup excludes the experimental ast-grep MCP server.

Current cases are the files named in the deterministic validator. The five cases
under [`behavioral/current-contract/`](behavioral/current-contract/README.md)
bind prompts, reused internal clean-context reviewer outputs, historical
independent gradings, and provenance to the exact v0.3.2 runtime payload. The
local metadata refresh retains the 35/35 assertion result and does not claim a
new reviewer or client run. The dated receipt is
[`2026-08-19-v0.3.2-local-metadata-refresh.md`](runs/2026-08-19-v0.3.2-local-metadata-refresh.md).

[`legacy-case-lineage.json`](legacy-case-lineage.json) records the explicit
disposition of the nine cases removed from the reviewed HEAD snapshot. Its
byte-locked sources live under
`legacy-case-baseline/1d454f06375f3b74ba506fef54b664a2517674c0/`, outside the installed skill
payload. The owning validator binds the exact deletion set and independent
HEAD SHA-256 values, requires every material legacy behavior bullet to map once
to an existing target heading/marker, and executes negative lineage fixtures.
Those tests mutate or remove only disposable copies under the operating system's
temporary directory; they never write the repository checkout or Git index, and
each fixture registers cleanup in `finally`.

## Captured behavioral suite

[`behavioral/`](behavioral/README.md) also retains four historical Codex final
responses, exact synthetic prompts, capture provenance, artifact hashes, and 28
machine-regraded assertions. That suite proves only the named v0.2.0 candidate
behaviors and remains separate from the v0.3.2 result.

## Deterministic gate

Run:

```bash
npm run validate:codegraph-ast-grep
```

The validator checks the installed runtime contract, current scenario structure,
all current source/prompt/output/grading/provenance hashes, exact runtime-payload
binding, the 5/35/0 independent review result, target-guidance persistence,
provenance-preserving setup/update behavior, doctor authority, current/legacy
command safety, and historical capture integrity. Validation itself is offline:
it does not invoke a reviewer, query the network, or execute CodeGraph/ast-grep.
