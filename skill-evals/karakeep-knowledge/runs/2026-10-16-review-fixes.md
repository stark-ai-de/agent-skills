# Karakeep 0.5.0 review corrections

## Candidate and evidence boundary

The approved public [specification](../../../docs/specs/karakeep-agent-knowledge-spec.md)
was saved and read back before implementation. Review baseline:
`8535511e7015a9cfff6919589152d10a5c17356e` in PR #148. Canonical skill 0.5.0 and
portable plugin 1.15.0 are the candidate; root catalog release metadata is unchanged.

Local native Linux checks use Node 24.22.0, Python 3.14.7, Bun 1.4.2 and the
repository-pinned pnpm 11.24.0. Frozen-lockfile installation reused the existing cache.
No alternate pnpm fallback is counted as evidence.

Helper/test content fingerprint: `da440590943b6a0422ff579508409452430983af97077383928943bd5fc986f0` (SHA-256 of sorted
`<file-sha256>  <repository-relative-path>\n` rows for every skill `scripts/` file and
`helper.test.mjs`, `test_karakeep.py`, `test_transport.py` in this evaluation directory).
This binds fixture evidence without claiming that a live installed skill changed.

## Observed regressions and fixes

The initial expanded Node suite reproduced 19 failures on the reviewed implementation;
17 cases passed. After corrections, `pnpm run validate:karakeep` passes **46 Node and
26 Python tests**. Synthetic fixtures cover:

- The v0.33.2 ordinary duplicate-save side effects and the `source: import` exemption;
  a racing human bookmark retains title, note, archived state and both timestamps,
  remains unowned and has no repeated remote mutation.
- Changed/deleted captures, missing capture endpoints, late-page errors and version
  changes: no dependent create/update/membership/tag writes; independent reports
  progress. Repeated apply/resume cannot substitute earlier receipt success. Stored
  original text is also re-read before an approved aggregate write.
- Create-request 400/401/403/429 and local policy rejection, explicit recovery after
  corrected credentials/policy, preserved successful predecessors, pending readiness,
  and accepted create followed by readback 403. Failure phase/code/outcome remain
  explicit and successful retry clears them.
- Lost create responses and simulated timeouts with/without visible objects, plus
  an actual bounded Node deadline. Recovery never blindly repeats create; old
  uncertainty without new evidence stays uncertain.
- Same-remote checkouts with different revisions, branches and bytes under inherited
  Git directory/worktree/common-directory/index/object/config selectors.
- Named `.localhost` rejection in Node and Python/MCP launch, sanitized transport
  categories, and the already-resolved Python malformed-response/deadline cases.

## Repository gates

Passed locally: `validate:karakeep`, `validate:skills`, `validate:scripts`,
`validate:projections`, `validate:network-endpoints`, `validate:plugin-evals`,
`validate:openai`, `validate:adrs`, `validate:runtime-matrix`, `validate:traceability`,
`validate:release-descriptor`, and `validate:contract-snapshots`. These checks were
renewed after integrating concurrent main revision
`d268d34036aca4d657d476b857d16329e4958c27`; `validate:architecture-compass` and
`validate:product-planning` also passed. Both runtime inventories and the main
Portless changes are preserved. The helper/test fingerprint stayed identical.
Targeted formatting of the complete PR diff and `git diff --check` passed.

`release:intent -- --base-ref d268d34036aca4d657d476b857d16329e4958c27` passed as a
feature contract (skill 0.5.0 and plugin 1.15.0), not a catalog release. The local
`validate` aggregate was not required/run; owning checks follow ADR-0041. Hosted
results must be read on the published commit and linked in PR #148 separately.

## Not claimed

The five [handoff scenarios](../README.md#handoff-evaluations-expected-not-executed-agent-runs)
are an agent-behavior rubric, not executed model evaluations. CLI commands were
checked against official v0.33.2 source (CLI package 0.33.0); no installed official-CLI
or live Hermes session was qualified. A same-name local command was a different
wrapper, so it was not counted as official-CLI evidence. No production collection,
receipt, installation, service or trust store was modified. Historical 0.3.0/0.4.0
live observations remain limited to their recorded candidates. No merge or release.
