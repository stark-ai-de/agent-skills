# Bounded code-record grant

The optional `codeRecords` field extends schema-version 1 collection policies. Existing policies retain their behavior. `kinds` must explicitly include `code-record`, destination list IDs must be the adopted private lists, roots and registry file must be absolute, include/exclude patterns must be nonempty relative scopes, `maxItems` is 1–20, `maxSeconds` is 1–600, and `approval` records the actual user grant. See the example asset. Model agreement is not adoption.

Use the existing connection, credential file, account state root and writer host. The shared writer lock, ownership receipts, conflict handling, readback and uncertain-response recovery remain authoritative. No new network client or independent writer is introduced. Approved findings/dossiers keep their original aggregate-grant rules; a code record cannot be used as original aggregate evidence.

An intent item has `kind: "code-record"`, a stable component `id`, `title`, and `codeRecord` with `selection`, captured `source`, `problem`, `useCase`, `dependencies`, `license`, `tests`, `adaptation`, `status`, and ISO `reviewedAt`. Selection contains registered `repoId`, relative `file`, `symbol`, and one-based `startLine`/`endLine` (at most 501 lines). Import `captureCodeSource(policy, selection)` from `scripts/knowledge/code-records.mjs` to capture proof. This read is local. The planner and each mutation independently recapture it; drift requires a new plan.

Source evidence includes repository identity, exact file/symbol/range, file and excerpt SHA-256 fingerprints, and a revision only if the actual file bytes match that HEAD file. Untracked or changed files are local drafts. Missing files can retire only an already owned record; an invalidated line range cannot remain validated. File symlinks, oversized/non-UTF8 files, unregistered roots and excluded/secret paths fail closed.

Identity is policy + repository + component, not a commit. Status is `candidate`, `source-checked`, or `practically-validated`; rendering explicitly attributes assessment to an agent. Tests use `command` and `outcome` (`not-run`, `passed`, `failed`). Executed claims also require a private `evidenceFile` and its SHA-256 `evidenceHash`: JSON schemaVersion 1, matching command/repoId/sourceHash and integer exitCode. Practical validation needs a passed receipt. The helper verifies evidence but neither runs test commands nor certifies a human review.

The normal managed-section three-way merge preserves user text outside the owned section and blocks conflicting changes inside it. Recheck sources periodically, downgrade changed components pending semantic reassessment, and surface retired/unresolved sources. A provider timeout is uncertain, not permission to retry a create. Follow the existing recovery protocol and receipts. A busy lock is pending; never steal a live lock. The apply deadline is checked before every remote mutation and source is rehashed; an in-flight bounded HTTP request may finish after the deadline.

Provenance also captures the current branch, a credential/query/fragment-free
HTTP(S)/SSH/Git origin, and the nearest regular conventional license file (relative
path and SHA-256, at most 64 KiB). Local/unsupported remote schemes are omitted.
No license file means `unknown`; an agent's free-text license assessment is not a
license grant or verified legal classification. Inspect the referenced license
and its applicability before reuse. Detached HEAD is explicit.

`draft`, `needs-review`, `stale`, and `retired` are rendered conventions, not native
Karakeep statuses. `candidate` or uncommitted content is a draft, assessed current
content needs human review, invalidated assessment/ranges are stale, and removed
sources are retired. Optional `assessmentSourceHash` binds the prior technical
assessment: a mismatch requires candidate status and no inherited executed-test
claims. Human review and manual notes remain outside the managed section and are
preserved. Agent assessment never sets human approval. A rename retires the old
selection; an explicitly verified new selection can retain the same component ID.
