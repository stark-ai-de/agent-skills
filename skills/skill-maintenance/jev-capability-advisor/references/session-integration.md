# Reusable host sessions

This is the **owner-process session** mode of Integrate. For optional Codex CLI or Claude Code reminders without a retained process, use [hook guidance](hook-integration.md). That mode delegates selection to the active agent and does not create an `AdvisorSession`.

Use this interface when a host you control needs repeated Jev advice. Keep one Python object or one NDJSON child process for the owning session. Supply its current eligible catalog with every task. HTTPS and a bounded derived search index are reused. Previous tasks and recommendations are not cached; the host must supply and validate current inventory on every request.

## Python interface

Resolve these modules relative to the installed skill's `scripts/` directory:

```python
from jev_session import AdvisorSession

with AdvisorSession(key_file=credential_path, total_budget_seconds=8) as session:
    advice = session.recommend({
        "id": "task-1",
        "query": current_task,
        "catalog": current_eligible_catalog,
    })
```

Call `recommend` again for subsequent tasks with refreshed host metadata. Each session instance owns its credential and connection. Close and recreate it when the owning host, credential or account scope changes. The key is read lazily on the first necessary API call; empty or disabled catalogs need no key. Errors discard the connection and never replay a POST.

## Choose the profile at session construction

The default `AdvisorSession()` uses `general`: it can advise on skills and tools and attempt a complete one-to-three recommendation. If the host explicitly requests **one next skill only**, construct a separate session:

```python
with AdvisorSession(
    key_file=credential_path,
    total_budget_seconds=8,
    selection_profile="next_skill",
) as session:
    advice = session.recommend({
        "id": "task-1",
        "query": current_task,
        "catalog": current_eligible_catalog,
    })
```

This is an owner-selected contract, not a task-by-task heuristic. The session's profile is read-only; to change it, close the session and construct another. Every frame still has exactly `id`, `query`, and `catalog`; a `selection_profile` frame field is invalid.

Next-skill mode validates the full current catalog before reading credentials or opening transport. Any enabled non-skill returns `next_skill_requires_skill_catalog`, even when retrieval would omit it. Disabled tools can remain present. Use `general` for mixed active inventory; do not silently remove tools or change the profile after an error.

A successful next-skill response contains exactly one selected ID, `status: next_skill`, `mode: NEXT_SKILL`, `selection_profile: next_skill` and `additional_work: unassessed`. No-match, clarification and error replies preserve the last two scope fields. General replies keep their existing shape. The host must handle the distinct status deliberately and must not treat it as complete compound-task coverage. A valid fresh next-skill selection makes at most one provider call; empty/invalid inputs make none.

The Python advisor API also accepts `advise(..., selection_profile="next_skill")`. A custom advisor injected into a next-skill Session receives that keyword and must honor the same result contract. General-profile injections retain their existing three positional arguments.

## Derived index reuse

- **Same selection inputs.** Every frame validates its current catalog, resolves aliases and searches for the current query. General descriptions retain their 200-character initial and 240-character follow-up budgets. Next-skill requests retain a 200-character budget, with optional enrichment of the first eight retrieved cards to 350 characters when request ceilings permit; they have no follow-ups.
- **Less repeated work.** An unchanged catalog can reuse its lexical index. The key includes full metadata, ordered alias representatives, retrieval policy, runtime source fingerprints and Python/Unicode versions. Returned records always come from the current frame.
- **Bounded ownership.** Each session retains at most one index, with a 2,000,000-byte catalog input limit and a 16-MiB retained-object limit (not a peak-process-memory limit). Changed inputs rebuild it; oversized or unavailable reuse falls back to fresh retrieval. Empty input, errors, reset and close clear it. No disk cache is enabled.
- **Fresh model decisions.** An index hit saves local preparation only. It still calls Jev and preserves current activation restrictions. A first or short-lived session pays index construction and retention-check costs.
- **Opt out.** Use `AdvisorSession(reuse_index=False)` or NDJSON `--no-index-reuse`. HTTPS reuse remains enabled. An injected custom advisor receives no implicit index memo. Its profile-specific call signature is described above.

Raw advisor receipts expose `index_cache.backend: session_memory`, hit/miss/bypass status and retained size. The compact general-profile Session reply remains unchanged; next-skill replies retain their explicit profile and unassessed-work marker. Do not retain sessions across host, credential or account ownership changes.

## NDJSON interface

Start one child process and retain its stdin/stdout for the owning host session:

```sh
python3 scripts/jev_session.py --key-file /path/to/local-key \
  --total-budget-seconds 8
```

For a host explicitly configured to choose one next skill, add `--selection-profile next_skill` at process startup. Do not add that field to individual frames.

Send one JSON object per line, with exactly `id`, `query` and `catalog`:

```json
{
  "id": "task-1",
  "query": "Review this diff",
  "catalog": [
    {
      "id": "skill:review",
      "name": "review",
      "kind": "skill",
      "description": "Review a supplied code diff for correctness."
    }
  ]
}
```

The child returns one JSON line with status, selected/provisional IDs, request counts, timing, candidate/eligible/represented counts, `catalog_truncated`, `none_scope` and a safe error code. Unknown coverage is `null` on early failures. It omits task text, descriptions, paths, raw provider receipts and credentials. IDs refer to the current input catalog; the host resolves them locally. This is a process protocol, not an MCP server or background service. No listener is opened and no host configuration is changed.

Frames are limited to 2,000,000 bytes before decoding, including a newline when present. Task IDs use 1–80 ASCII letters, digits, `_`, `.`, `:` or `-`, beginning with a letter or digit. Queries are nonblank and at most 16,000 characters. Catalogs contain at most 4096 records using the [catalog fields](contract.md#catalog); names are at most 256 characters, descriptions/briefs at most 32,768, and capability IDs at most 256 safe ASCII characters. Unknown fields, duplicate IDs/JSON keys, invalid flags and nonfinite JSON values are rejected.

An oversized frame returns `frame_too_large` and terminates without draining the input. Other malformed frames return a safe error and permit a subsequent valid frame with a fresh connection. EOF, broken output and cancellation close the session. `request_count` counts advisor attempts; `transport_call_count` counts client invocations, not confirmed server receipt.

## Host responsibilities

1. Enable data processing explicitly: the supplied task and bounded capability descriptions go to TypeSafe. Reuse existing authorization for the actual scope; synthetic benchmark permission does not cover unrelated future private content.
2. Obtain the active session's eligible capabilities and preserve disabled, explicit-only and account restrictions. Files on disk or another client's catalog do not prove availability. Do not retain a catalog across turns without a host freshness check.
3. If automatic advice is wanted, qualify the real pre-task callback, eligible inventory, advice delivery before substantive work, and actual adoption independently for that host. A model-mediated static hook runs before model processing but consultation occurs afterward; it must not be described as advice before the first model action. Keep explicit user choices and native fallback. Skill/plugin installation alone proves none of these steps.
4. Enforce an outer deadline for the complete active callback, including IPC and serialization. The default inner eight-second budget covers recommendation validation, preparation, credential/client setup and API calls. Input waiting/JSON decoding and output serialization/flushing are outside that inner budget. Native DNS/certificate-store calls are not forcibly interruptible; terminate the owned process when a hard cutoff is required.
5. Validate returned IDs against the current catalog and interpret `selected`, `next_skill`, `none`, `clarify`, incomplete proposals and `error` separately. A next-skill result identifies one next skill; `additional_work: unassessed` means the host still owns every remaining deliverable and must not mark the whole task covered. Check the coverage fields: `none_scope: retrieved_candidates` covers only the considered shortlist. If `catalog_truncated` is true or unknown, use native discovery for unresolved work and never treat NONE as proof that no capability exists in the full catalog. Advice grants no execution authority. The host owns loading, permissions and tool execution; unavailable or stale integration falls back to native discovery.

## Current qualification boundary

The reusable Python/NDJSON interface is implemented. Choosing the next-skill profile does not itself prove lower latency, lower provider input or correct selection; those need separate profile-specific live evidence. Recorded-response parity of the general path is deterministic regression evidence, not a fresh live accuracy result. Automatic Codex, Claude Code and OpenAI-plugin interception remains separately unqualified. In Codex 0.154.0, hooks expose prompt/session/turn context, but no complete eligible capability snapshot. Thread-scoped MCP status and cwd-scoped skill discovery are useful inventory signals; they do not export every effective activation and prepared-call permission restriction. Do not silently turn those declarations into a fully eligible catalog.

A controlled host can supply its authoritative eligible snapshot directly. For native integration, require an appropriate host export before claiming automatic routing. Recheck version-sensitive interfaces in the [official hook reference](https://learn.chatgpt.com/docs/hooks) and [app-server reference](https://learn.chatgpt.com/docs/app-server). Selector/session benchmarks do not prove installed-hook activation or whole-task acceleration.
