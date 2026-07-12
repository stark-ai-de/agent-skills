# 2026-07-12 Portable Conditional Planning Lifecycle

## Scope

Release proof for Architecture Compass 0.2.0 and repository release v0.8.0.
The review covers conditional routing, separate planning and permission
evidence, read-only decision phases, direct/native/fallback continuations,
write-permission readiness, host fallbacks, and bounded execution.

## Final Candidate Identity

The final public skill and both disposable Codex/Cursor installations were
byte-identical. The SHA-256 over each sorted relative path, a NUL separator,
its bytes, and a trailing NUL was:

`b4048a98fd9a3f77189504ef72cafd8509f0648ab379157c96b4b07243349835`

The candidate contains 16 files. It reports planning capability and read-only
enforcement separately, treats Plan as a collaboration mode rather than a
permission boundary, and blocks direct or fallback implementation on a known
pending write-capable transition.

## Static Contract Review

All 15 focused text cases were reviewed against `SKILL.md`, the host adapter,
the adoption workflow, templates, checklist, and lifecycle rubric. Every case
has a self-contained prompt, non-empty expected behavior, text-only workspace
policy, deterministic assertions, and explicit assertions for:

- `Planning capability`,
- `Read-only enforcement`,
- `Architecture decision status`, and
- `Execution status`.

The final split preparation produced 9 training, 3 validation, and 3 test
items. A parser regression proves that wrapped expected-behavior bullets reach
the semantic judge intact instead of being truncated at their first physical
line.

The suite covers:

- conditional Plan and Read Only transitions,
- explicit read-only refusal with a behavioral no-write fallback,
- contradictory accepted ADRs and direct-route reclassification,
- direct execution and pending direct-route write permission,
- unavailable, declined, and indeterminate planning fallbacks,
- native, portable-fallback, and direct permission continuations,
- approval without an implementation request,
- material re-entry drift, and
- read-only audit and host-review routing.

An independent final diff review found no P1 or P2 issues after the contract
alignment.

## Live Runtime Proof

Both disposable fixtures started from a committed documentation-only baseline
with preserved untracked and ignored sentinels. Their accepted ADR required one
canonical architecture summary but left its path unresolved. The approved
choice was `docs/architecture.md`; the only implementation paths were
`AGENTS.md` and `docs/architecture.md`, and the only validation was
`git diff --check -- AGENTS.md docs/architecture.md`.

### Codex

- Runtime: Codex CLI 0.144.1.
- Baseline commit: `a2c015d09cbb8471e97fee470cbfcb7632647a59`.
- Baseline content hash outside `.git`:
  `352cf0d48304f33b68b415167f5b02c8e3f2ce084992d9697b5e8574ee2fa3d5`.
- Baseline Git index SHA-256:
  `d6e77fbe361b19f58d87b383c86eb93c19167341db76cc5991b41f2da14a6b70`.
- Native Plan session: `019f56a4-b302-7772-98fd-31b191b09e47`.
- Execution session: `019f56aa-202e-7522-882b-38132cc7cb5b`.

The native Plan session ran with the runtime's read-only sandbox. It reported
`Planning capability: Active` and `Read-only enforcement: Enforced`, then
returned `Architecture decision status: approved`,
`Execution status: pending Plan-mode exit`, the exact two-path allowlist,
validation command, and canonical native continuation. HEAD, full status
including ignored and untracked entries, content, raw index hash, and staged
count remained byte-identical through Plan exit.

Execution used a separate default/workspace-write session after Plan exited.
It re-read root, branch, HEAD, index-safe status, the accepted ADR, both targets,
content digest, raw index checksum, and staged count before writing. It changed
exactly `AGENTS.md` and `docs/architecture.md`, preserved prior instruction
content, passed the scoped validation, staged nothing, and reported explicit
not-applicable capability fields plus approved/completed lifecycle statuses.
The final content hash outside `.git` was
`dc51212252fc77b3fe3a1904fe84c45345556dea8c83e436ded494c598bbc2eb`;
HEAD and the index hash remained unchanged.

The first Plan status call was path-scoped without `--no-optional-locks`; the
later status used the required index-safe form. The enforced read-only sandbox
and identical raw index, content, HEAD, and full-status evidence prove that the
decision phase did not mutate the fixture.

### Cursor

- Runtime: Cursor Agent 2026.07.09-a3815c0.
- Baseline commit: `acb37244aaabf05d1e644a8d6b4ee9b7e6dfa100`.
- Baseline content hash outside `.git`:
  `29546245c43a42148e8df437d57525dd9ca49822d5b7f204c847e85ae28dd673`.
- Baseline Git index SHA-256:
  `49a77f1407de567e6685a29c903cea2f9dbd804922c751093eb03f824207d308`.
- Conversation: `44132c18-67d4-4ffb-bd0c-a61dc180ed16`.

The native run started with Plan active. Command metadata exposed a
workspace-read/write policy rather than a read-only boundary, so the candidate
correctly reported `Planning capability: Active` and
`Read-only enforcement: unavailable`. It returned approved/pending-Plan-exit
statuses, the exact allowlist and validation, and the canonical continuation.
HEAD, full ignored/untracked status, content, raw index hash, and staged count
remained unchanged through the approved checkpoint.

After the native Build transition, Cursor re-read HEAD, full status, ADR, and
targets before edits. It changed exactly `AGENTS.md` and
`docs/architecture.md`, passed the scoped validation, staged nothing, preserved
the index hash, and reported approved/completed. The final content hash outside
`.git` was
`4b4d56066b25c6dca496543746ce8c8c3797177ddf44c7ccf76b509d518538c2`.

Cursor's sandboxed shell encountered an environment-specific missing-shell
error while native read tools remained usable. One transient Plan response
updated only the host-managed plan before the follow-up emitted the complete
checkpoint. Neither condition changed the fixture or the result.

## Result

The exact installed candidate passed both available live runtimes. Each host
kept the decision phase free of fixture writes, returned the bounded handoff,
performed a separate execution transition and mandatory state recheck, changed
only approved paths, passed validation, and left the Git index untouched. Both
proofs also verified that the release worktree's HEAD, content, status, index,
and candidate hash remained unchanged.

The final repository candidate passed:

- `npm run validate`
- `pnpm format:check`
- `pnpm lint`
- `git diff --check`
- `npm run list`
- `npx skills@latest add ./skills --list`
- `npm run smoke:install`
- release-intent and v0.8.0 release validation
- frozen-lockfile installation
- release-helper dry run and release-note generation

## Limitations

- Cursor had no enforceable OS read-only boundary in this run; the proof is an
  explicit unavailable-enforcement fallback plus independent no-write hashes,
  not sandbox proof.
- No authenticated Claude Code runtime was available. Claude portability is
  source-backed only.
- The 15-case split meets the exploratory floor but remains below SkillOpt's
  official-parity recommendation of 20 positive cases with 5 validation and 5
  test cases. This record claims deterministic contract review, not optimization
  parity or a full semantic-judge benchmark.
