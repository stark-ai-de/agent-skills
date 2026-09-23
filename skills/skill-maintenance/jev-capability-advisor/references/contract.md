# Capability advisor contract

This is an on-demand capability advisor. Native client discovery and permissions remain in control. A recommendation identifies a next step; it does not load a skill, start an MCP server, or execute a tool.

## Catalog

Supply a JSON array exported from the current host's available capabilities. Do not infer availability from files installed on disk. Use stable host IDs and preserve invocation restrictions:

```json
[
  {
    "id": "skill:example-review",
    "kind": "skill",
    "name": "example-review",
    "description": "Review a supplied code diff for correctness and regressions.",
    "enabled": true,
    "explicit_only": false
  },
  {
    "id": "tool:example.read_issue",
    "kind": "tool",
    "name": "example.read_issue",
    "description": "Read an issue from the already connected example issue tracker.",
    "enabled": true,
    "explicit_only": false
  }
]
```

Required fields are unique `id`, `kind`, and `name`; meaningful `description` is necessary for useful semantic selection. Optional `brief` is a concise selection description. `enabled: false` excludes a capability. `explicit_only: true` is preserved in the model's selection instructions; the host must independently enforce it before activation.

### Optional routing guidance

The host may supply public, source-backed applicability guidance in these optional top-level fields:

```json
{
  "use_when": ["Review a supplied code diff before merging."],
  "avoid_when": ["The task only asks to rephrase a sentence."],
  "keywords": ["code review", "regression"],
  "parameter_descriptions": {
    "diff": "The code changes supplied for review."
  }
}
```

`use_when`, `avoid_when`, and `keywords` accept a string or a list of at most 64 strings. `parameter_descriptions` accepts a map of at most 64 parameter names to description strings. Each field's combined normalized text is limited to 8192 characters. Invalid types, nested values, and nonfinite numbers are rejected. These are descriptions, not argument values, executable schemas, permissions, or proof that a service is configured.

Only `use_when`, `keywords`, and parameter descriptions contribute positive lexical relevance. `avoid_when` never enters positive retrieval terms. Jev sees explicitly labeled, compact guidance within the existing card budget; long values are shortened. Known local source paths are removed before card truncation. Other provenance metadata stays local. The compact initial request replaces the previous provider wire format: cards omit the default `explicit_only=false`, while `explicit_only=true` remains explicit; option descriptions reference their shared card codes instead of repeating names. Initial descriptions and guidance share a 200-character budget per card. Conditioned follow-ups preserve the established 240-character description/guidance budget, explicit flags, named options and instructions so closely related remaining tools retain their fuller context. Both budgets may shrink further to satisfy the existing byte ceilings; queries are never shortened. A premature STOP is still incomplete, not success. Host output and permission semantics are unchanged, and source fingerprints invalidate decisions cached by an older implementation.

The helper does not invent, translate, fetch, or verify this guidance. The host owns its public source evidence and freshness. Disabled and explicit-only restrictions remain authoritative; semantic applicability is advisory. Full catalog metadata, including these fields and local provenance, participates in both cache identities.

### Verified skill aliases

The host may declare the same `skill_identity` and `bundle_sha256` on copies of one skill. Identity is a stable host-verified skill identity, not a guessed namespace suffix. The digest must be 64 hexadecimal characters covering the complete loadable package: `SKILL.md`, instructions, scripts, resources, agent metadata and dependency declarations. A reproducible host exporter can hash a sorted manifest of relative file paths, executable bits and SHA-256 file digests. Resolve referenced/symlinked content in that proof; omit equivalence metadata when outside dependencies or differing host configuration prevent proving equivalence. The helper trusts this declaration; it does not traverse the filesystem to verify it.

Only `kind: skill` entries with that proof and equal remaining metadata/restrictions merge. IDs, names, local source paths and the enabled flag may differ; disabled records are removed first. `content_sha256` remains local provenance and **does not alone establish package equivalence**. Equal descriptions, matching names, missing/invalid hashes and MCP/tool entries never establish aliases.

Consolidation happens before the 240-card retrieval limit. An exact, uniquely identifying name or ID in the task selects that original variant as representative. Distinct explicitly named variants remain available separately. Otherwise the unqualified identity name, then name/ID order determines the representative. The result's `candidate_aliases` preserves original IDs, names and local sources. `eligible_count` counts enabled originals, `distinct_capability_count` counts representatives, and `represented_count` counts originals covered by retrieved representatives; removed duplicates are not reported as retrieval omissions.

Only send public, selection-relevant descriptions. Exclude credentials, customer data, private filesystem paths, tool arguments, and tool results. Arbitrary extra metadata is not sent as provider state. Do not rely on this helper to recognize and redact arbitrary secrets embedded in free text.

## Commands

Run from the skill directory. The host prepares the catalog outside a versioned repository; the helper does not modify host configuration or discover hidden tools.

```sh
# Inspect local candidates; no credential read or network request.
python3 scripts/jev_advisor.py --catalog /path/to/catalog.json \
  --query "Review the supplied code diff" --offline-candidates

# Recommend using an existing local raw-key file.
python3 scripts/jev_advisor.py --catalog /path/to/catalog.json \
  --query-file /path/to/task.txt --key-file /path/to/local-key \
  --summary --output /path/to/local-result.json
```

Alternatively provide `TYPESAFE_API_KEY` through the existing process environment. Never put the secret in a command argument or checked-in file. `--output` writes the complete result file. Without `--summary`, the full result is also printed as before. Receipts contain the supplied task and catalog cards, so store them locally.

### Compact host output

For Recommend, `--summary` prints only outcomes, selected and provisional capability cards with their complete input-catalog descriptions, restrictions, coverage counts, timing, cache/usage status and receipt fingerprints. It omits the complete candidate list and raw request/response bodies. `--output` still stores the full receipt unchanged. Summary-only operation creates no receipt file implicitly. `--summary` and `--offline-candidates` are mutually exclusive: Inspect retains its complete candidate view.

Reuse a current host-exported catalog directly instead of copying it into the conversation. Check relevance and coverage using the complete descriptions and applicability guidance in the summary, together with host permissions. Resolve original metadata only when fields are missing, stale or inconsistent; do not reread the same fields solely for confirmation; inspect the full receipt or use native discovery for uncovered or inconsistent advice. Do not repeat the full catalog search after every fitting recommendation. This reduces repeated host work without changing retrieval, provider requests, selection semantics, or execution authority. A formally complete selection can still be wrong; compact output does not certify correctness.

## Repeated recommendations

A single CLI recommendation reuses one verified HTTPS connection for its conditioned follow-up calls and closes it afterward. Separate CLI processes start with separate connections. The optional [owner-process session interface](session-integration.md) keeps a healthy connection across distinct tasks while requiring a fresh host catalog every time; it reuses bounded derived search data, never decisions or inventory authority.

The direct transport retains TLS certificate/hostname verification, bounds body size and I/O time, and never automatically replays a POST after failure. A stale connection fails the current request; native discovery can continue, and the next distinct request may establish a new connection. Configured proxy environments use the standard urllib fallback without pooling, including environments containing only a `NO_PROXY` entry. Native DNS and certificate-store calls remain subject to platform blocking behavior; a host needing a strict wall-clock cutoff owns an outer process deadline.

## Local decision cache

Caching is off by default. Opt in with a dedicated local directory outside the repository and a non-secret context label representing the current host, workspace and connected accounts:

```sh
python3 scripts/jev_advisor.py --catalog /path/to/catalog.json \
  --query-file /path/to/task.txt --key-file /path/to/local-key \
  --cache-dir /path/to/private/jev-cache \
  --cache-scope "host-workspace-connections-v1"
```

Use a different scope when connection/account context changes. Supply current availability and activation restrictions every time. Relevant conversation context must be part of the supplied query; the helper cannot invalidate hidden state it never receives. Cached advice never replaces the host's authorization checks.

The cache key binds the **complete query**, complete current catalog including alias/source/restriction metadata, scope, endpoint/model, rules, implementation files, retrieval policy and limits. Native HTTPS and injected test transports use separate cache namespaces. Candidates and their availability are recomputed before reuse. Catalog order alone does not invalidate a result.

`--cache-ttl-seconds` defaults to 3600 and must be positive, at most 86400. Expired, malformed, oversized, incompatible or unavailable entries are misses; no stale fallback is served. Only complete `selected`, model `none`, and initial model `clarify` outcomes can be cached. Errors and incomplete compound plans cannot. Cache failure does not invalidate a successful fresh recommendation.

The helper creates a private POSIX directory (0700) and atomic owner-only files (0600), rejects shared/symlinked cache locations, and keeps at most 256 of its own entries by evicting the oldest. Cache files contain decision IDs and source receipt identity, not task text, full responses, credentials or source paths. They are local metadata, not encrypted storage. `--offline-candidates` ignores decision-cache options and performs no credential I/O. It accesses an index cache only when `--index-cache-dir` is explicitly supplied. On platforms without the required private-file primitives, caching is unavailable and fresh uncached operation continues.

On a hit, `cache.status` is `hit`, `request_count` is zero, `requests` and `usage` are empty, and `usage_total` is empty. `elapsed_ms` measures the current call, including retrieval and cache work; original receipt identity/time is under `cache.source_receipt_digest` and `cache.source_started_at`. It is not counted as new provider usage. Cold results expose cache lookup and write status separately. A hit can return without reading an API key; a miss still needs the configured credential.

## Session-owned index reuse

`AdvisorSession` reuses one bounded in-memory lexical index by default; direct `advise` calls do not. The [session contract](session-integration.md#derived-index-reuse) defines identity, invalidation, memory bounds and opt-out. Every valid recommendation validates current metadata and resolves aliases; a nonempty eligible selection calls Jev. Empty or invalid inputs need no model request. This is independent from the explicitly enabled disk and decision caches below; it stores neither decisions nor query text. The internal `memory_index=` and `index_cache_dir=` options are mutually exclusive.

## Optional local index cache

The on-disk lexical index cache is independent from the decision cache and off by default. Explicitly enable it for local inspection or fresh recommendations:

```sh
python3 scripts/jev_advisor.py --catalog /path/to/catalog.json \
  --query "Review the supplied code diff" --offline-candidates \
  --index-cache-dir /path/to/private/jev-index
```

Without that option there are no on-disk index-cache reads, directory creation, or writes. `--cache-dir` does not implicitly enable it. The Python API accepts `index_cache_dir=` and `retrieval_policy=` on `advise`, `offline_candidates`, and candidate preparation; the default policy is `current`.

A cache identity binds the complete host catalog, actual query-specific alias representatives, policy, schema, runtime source fingerprints, and Python/Unicode versions. The persisted JSON contains explicit lexical postings and weights, not queries, credentials, source paths, model decisions, provider groups, or permission state. Supply only public selection metadata: an index can retain tokens from the descriptions it indexes. Current cards and restrictions always come from the supplied catalog.

Cache reads reject incompatible, malformed, oversized, nonfinite, duplicate-key, or structurally inconsistent snapshots. All posting types, document ranges, ordering, uniqueness, numeric bounds, gram weights, and identifier coverage are validated before restoring explicit fields. Skills, tools, provider groups and aliases are derived from the current catalog. No pickle or unrestricted object-state restoration is used. Digests detect inconsistency; the private local cache is not encrypted or authenticated against a malicious process running as the same user.

Private POSIX directories and files require the current owner, reject symlinks, and use directory-relative file descriptors. Writes use an exclusive lock, a temporary owner-only file, synchronization, and atomic replacement. Lock contention skips the optional write. At most 16 managed entries, 16 MiB per entry, and 64 MiB total are retained by oldest-first eviction. Cache errors, unsupported platforms, missing entries and failed writes fall back to a fresh index; they do not prevent otherwise valid advice. Invalid catalogs still fail.

`index_cache.status` records `disabled`, `miss`, `hit`, `invalid`, or `unavailable`; fresh builds expose a separate `write_status`. These receipts describe local reuse, not model quality or saved provider usage. An index hit alone does not avoid a fresh API call; only a valid decision-cache hit can do that.

## Selection and limits

1. Local retrieval keeps all distinct skill representatives when they fit within the 240-card budget. Remaining space goes to tools ranked by identifiers, description terms, character trigrams, and named-provider coverage. Positive optional routing guidance also contributes. There is no translation model in local retrieval. The default `--retrieval-policy current` retains existing allocation. Experimental `--retrieval-policy balanced` reserves exact requested tool IDs/names first, allocates up to 80% of tool capacity fairly across named providers and their transports, then prioritizes relevant outside-provider tools before global fill. Exact requests override the allocation budget. Both policies preserve the 240-card limit and skill coverage when all representatives fit; balanced is not automatically selected or claimed superior.
2. Jev selects a cardinality and one primary capability. Both questions receive the candidate context. Separate explicit tasks can require a pair or triple; later workflow dependencies do not justify extra recommendations.
3. Follow-up decisions receive the previous selections and choose only the next necessary capability. The helper excludes selected IDs and verified aliases. At most three API calls and three final IDs are possible.

Retrieval is bounded, so omitted tools can still be relevant. If more than 240 skills exist, even skill coverage is partial. Check the receipt's candidate coverage and let native discovery handle unresolved cases. `none` describes the supplied candidate set, not proof that no suitable capability exists anywhere.

The fixed endpoint is `https://api.typesafe.ai/v1/systemone`, using `jev-1.13.0`. Query length, choice count, serialized request size, and response size are bounded. Byte ceilings are not tokenizer guarantees: provider context errors remain errors. Requests do not retry automatically. The transport uses a 30-second network timeout and bounded response reads; DNS and connection setup are subject to the platform's networking behavior.

## Outcomes

| Status       | Meaning                                                                               | Host action                                                                   |
| ------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `selected`   | A complete recommendation of one to three IDs                                         | Verify availability and restrictions, then follow the user's authorized task  |
| `none`       | No candidate needed or suitable in the supplied subset                                | Continue without one or use native discovery if coverage is incomplete        |
| `clarify`    | Ambiguity, too many first steps, or an incomplete cardinality plan                    | Resolve the missing intent; provisional IDs are not a complete recommendation |
| `error`      | Invalid input, malformed provider response, missing credentials, or transport failure | Report the failure; offline inspection can still help                         |
| `candidates` | Offline retrieval only                                                                | Do not describe this as a semantic selection                                  |

Live receipts record candidate IDs, request/response hashes, raw payloads without authentication headers, usage, timing, and errors. Usage and latency are observations, not a quality guarantee. Network failure never becomes a successful no-capability answer.

Provider confidence is retained as raw observation and does not gate this advisory output. Low confidence never silently becomes `none`; high confidence cannot rescue an unknown ID or inconsistent response. Missing or nonnumeric confidence is not interpreted as evidence of trust. Nonfinite JSON values fail closed. There is no newly calibrated confidence threshold in this revision.

## Evaluation boundary

Use independent labeled queries and report exact selection quality, unnecessary selections, retrieval misses, ambiguous/no-capability outcomes, API errors, and latency separately. Freeze code and labels before held-out evaluation. Development-set gains alone do not qualify this skill for public promotion.

This helper measures recommendation time. It does not measure native tool discovery, skill loading, MCP startup, execution success, or end-to-end task speed. Native selection remains the default.
