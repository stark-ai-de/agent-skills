# Node helper and installation contract

## Responsibilities and prerequisites

`node <absolute-skill-root>/scripts/knowledge.mjs` uses only Node.js 24.18+ built-ins
and the existing Linux Git executable. It supports the official Karakeep 0.33 REST
API with a loopback HTTP(S) origin. Keep existing Python setup helpers and MCP reads.
No package installation, global executable, background service or helper-side LLM.

The helper owns identity, verified Git snapshots, paginated inventory/content reads,
plan binding, three-way field comparisons, serial writes, private receipts, readback
and uncertain-outcome recovery. The agent owns selection, complete reference review,
content assessment, factual reporting, synthesis, proposals and policy adoption.

Use private owner-only regular files (0600), private directories (0700), absolute
paths and no symlinks for credentials, policies or state. Credentials are referenced,
never passed on the command line. Proxy-enabled Node runtimes are refused because
this profile sends private credentials only to loopback; request the host's normal
local-service permission instead of bypassing its sandbox/network restrictions.

## Global installation and start instruction

Install this skill once in the host's supported user-wide skill location. Codex
loads `~/.agents/skills/karakeep-knowledge`; check plugins for duplicate names first.
Use the configuration owner to export [global-instructions.md](../assets/global-instructions.md)
into the actual Codex home's `AGENTS.md`, preserving existing content and backing it
up before a bounded change. A managed configuration's tracked source must include
the instruction; do not edit a generated cache or replace the entire global file.
Record source revision/digests and destinations in a private installation receipt.

The instruction is an agent behavior, not an executable host hook. Qualify it with a
fresh real session that actually invokes `check`; unit tests or file presence alone
are insufficient. Other hosts need their own supported instruction/discovery entry.
A one-time manual invocation plus [project instruction](../assets/project-instructions.md)
is the fallback. Do not claim Codex guidance configures Hermes automatically.

Default descriptor: `$XDG_CONFIG_HOME/karakeep/knowledge/config.json`, otherwise
`~/.config/karakeep/knowledge/config.json`. Schema:

```json
{
  "schemaVersion": 1,
  "collectionPolicy": "/private/config/collection.json",
  "projects": [
    { "remote": "git@example.org:owner/repository.git", "policy": "/private/config/project.json" }
  ]
}
```

An empty `projects` list is valid: global checks work before individual adoption.
`collectionPolicy` permits a small connection probe even for an unadopted project.
A repository policy is matched by its exact `origin` URL. An installation alone
never grants all-repository import. Setup creates policies/lists using the existing
account and explicit grant; the helper consumes them and never invents a grant.

## Policy schema

Start with [policy.example.json](../assets/policy.example.json), replacing every
placeholder. `scope` is `project` or `collection`; collection scope omits `repo` and
cannot authorize Git document copies or project overviews. `id` is a stable policy
identity; `revision` changes when scope changes. `approval` records the actual grant.
`writerHost` is the one designated local hostname; all policies for the same account
must use the same `stateRoot` and writer. The runtime descriptor/state are private.

`repo` records stable project ID, exact remote, remote name (default `origin`),
verified default branch, relative include/exclude globs and optional stable
`workContext`. Prefer explicit knowledge paths. Detached checkouts use their commit
as context unless one is adopted. Canonical and draft keys always differ.

`connection` requires `address`, expected `accountId`, `apiProfile: karakeep-0.33`,
qualified `scopes`, and exactly one credential reference. `credentialFile` contains
only literal `KARAKEEP_API_ADDR=...` and `KARAKEEP_API_KEY=...` assignments; no shell
execution. Alternatively `credentialEnv: {"address":"ENV_NAME","key":"ENV_NAME"}`
references host-provided variables. Never put secret values in policy/examples.
Typical writer scopes: `bookmarks:readwrite`, `lists:readwrite`, `tags:readwrite`,
`users:read`; `assets:read` only if needed by the read workflow. Probe the actual key;
a declared scope is not proof of capability. Preserve existing read credentials.

`writeEnabled` gates mutations. `operations` permits `create`, `update`, `membership`,
`tag` independently. `listIds` must identify private manual lists. `tags` maps roles
to explicit normalized lowercase alphanumeric/hyphen names. No delete, global
archive, tag merge or sharing operation is exposed. `maxContentBytes` defaults to
16 MiB per local document (64 MiB maximum); exceeded bounds report an error.

`approvedAggregates` entries bind `{id,purpose,inputKeys,approval}`. Newly proposed
findings/dossiers/datasets stay proposals until adopted. One factual project
`overview` is already permitted by an adopted project policy. Original sources,
documents and factual session reports may supply evidence; derived artifacts may
not stand in for original evidence.

## Commands and exact flow

Resolve every placeholder to an absolute path. Create a unique private run directory
under `stateRoot` for each inspection/plan; retain previous files for recovery.

```sh
node /installed/karakeep-knowledge/scripts/knowledge.mjs check --repo /repository/root
node /installed/karakeep-knowledge/scripts/knowledge.mjs inspect --policy /private/project.json --repo /repository/root --out /private/state/runs/RUN/inspection.json
node /installed/karakeep-knowledge/scripts/knowledge.mjs plan --policy /private/project.json --inspection /private/state/runs/RUN/inspection.json --intent /private/state/runs/RUN/intent.json --out /private/state/runs/RUN/plan.json
node /installed/karakeep-knowledge/scripts/knowledge.mjs apply --policy /private/project.json --plan /private/state/runs/RUN/plan.json --expect-plan SHA256_FROM_PLAN_OUTPUT
node /installed/karakeep-knowledge/scripts/knowledge.mjs status --policy /private/project.json --online
node /installed/karakeep-knowledge/scripts/knowledge.mjs resume --policy /private/project.json --operation UUID_FROM_RECEIPT
```

`inspect --offline` creates unverified local evidence, not an apply-ready plan.
Collection inspection omits `--repo`. `check --config FILE` selects a descriptor.
`status` without `--online` reads only local state. `resume --recover-lock` additionally
recovers an explicitly verified dead same-host PID; it never steals a live lock.
JSON goes to stdout; redacted diagnostics go to stderr. Exit 0 indicates a valid
result including `needs_setup`/`planned`, 2 indicates pending/conflict/unreachable,
and 1 an error. Always inspect JSON status, not just the process exit code.

### Agent-authored intent

Write mode-0600 JSON beside the inspection:

```json
{
  "schemaVersion": 1,
  "inspectionId": "ID_FROM_INSPECT",
  "items": [
    {
      "kind": "session",
      "id": "stable-session-segment-id",
      "title": "Factual work report",
      "contentFile": "session.md",
      "references": []
    }
  ]
}
```

Content files are private UTF-8 files in that run directory, without traversal or
symlinks. The helper reads exact bytes and binds them into the plan.

- `document`: `documentKey` from inspection, title, `coverage: {contentHash,
allDirectReferencesReviewed:true}` and all `references`. No `contentFile` or URL:
  exact canonical/draft text comes from inspection. Coverage is an agent attestation,
  not automated proof that the prose was understood.
- `source`: exact HTTP(S) `url`, title, optional `capture: {status,contentHash,reason}`.
  Status is `verified`, `missing` or `pending`. Creation alone remains unverified.
  Plan saves full paginated content under `captures/BOOKMARK_ID.json`; read it and
  supply the matching assessed hash. Include freshly assessed source items in the
  same intent as documents/aggregates claiming their verified content.
- `session`: stable `id`, title and `contentFile`; concise facts, no invented timing.
- `overview`, `finding`, `dossier`, `dataset`: title, content file, stable `id` (optional
  only for project overview), `purpose` and `inputs: [{key,contentHash}]` identifying
  original source versions. New independent artifacts produce proposal operations.

Each reference has `target`, `outcome` and either a verified original `key`, or a
`reason` for `pending`, `missing` or `excluded`. Preserve missing evidence in the
text; do not silently omit it to obtain completion. Link-list references require
actual source content, not just bookmark existence. Functional query/fragment URL
parts remain identity-significant. Exact body updates use REST `PATCH` with `text`.

The resulting plan includes operation identity, exact digest, content, metadata,
before values and action outcomes. Review it locally within the grant; no repeated
user confirmation is needed for already approved routine writes. Apply validates
policy, input hashes, current Git source and owned remote fields again.

## Receipts and failure handling

State lives below `stateRoot/collections/<account-origin-hash>/`: `store.json`,
`operations/<uuid>.json` and a temporary exclusive `writer.lock`. It is operational
state, not another knowledge database. Keep it private and back it up with the
configuration. Store loss does not grant ownership of existing objects.

Reuse existing bookmarks by exact URL without changing human fields. A managed note
section carries provenance; text outside it remains intact. Repeated success makes
no remote write when fields/memberships/tags match. Every mutation is persisted as
attempting before the request and verified after readback. Uncertain creation is
reconciled by exact URL or an operation marker; ambiguity stays pending. Reusing
sources across project lists never authorizes removal of other memberships.

Do not delete receipts or repeatedly create after a timeout. Resume the operation;
if original inputs changed, reconcile the recorded object and ownership first, then
inspect/plan the current state. Changed policies, ambiguous duplicates and human
conflicts require an explicit bounded resolution. The API cannot provide an atomic
transaction with concurrent human edits; never claim otherwise.
