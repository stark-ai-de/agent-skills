# Private hook catalog evidence

Use `scripts/hook_catalog.py` to check a separate local provenance record against the exact catalog. This read-only checker performs no discovery, credential access, provider requests, cache access or writes. Its success establishes internal consistency, **not host attestation, current availability or permission**.

## Capture current evidence

1. Use the running session's model-visible skill cards and loaded callable MCP definitions. Keep exact invocation names and public descriptions; do not rewrite descriptions from memory. A discovery advertisement is insufficient. Installed files may supplement selection metadata for an already advertised capability but cannot establish availability.
2. Establish effective invocation restrictions from the same session. Documented defaults require evidence applicable to the observed host version and must preserve current overrides. Exclude disabled capabilities and unresolved availability/restrictions. Explicit-only entries require an actual user invocation, recorded as a local reference without copying user text.
3. Write the bare-array [catalog](contract.md#catalog). Each included item must have `kind: skill|tool`, a nonempty public `description`, `enabled: true`, and boolean `explicit_only`. Tools must be MCP capabilities, never built-in host tools. Capture a sidecar at the same time, retaining references to the observed metadata. Do not fabricate provenance by copying a completed catalog and declaring it verified.
4. Keep snapshots, references and omissions private and separate from provider input. A fresh local capture token binds these files to your current capture assertion; it is **not a native session ID**. Refresh the records when metadata or restrictions change.

## Sidecar format

Replace these placeholders with current evidence. `snapshot` must equal the **entire catalog item**, including any optional `brief` or routing guidance. Every catalog item needs exactly one snapshot; no extras are permitted.

```json
{
  "version": 1,
  "host": "codex",
  "host_version": "<observed version>",
  "capture": {
    "token": "capture-example-1",
    "binding": "agent_asserted_current_session"
  },
  "catalog_sha256": "<filled by preparation below>",
  "coverage": {
    "completeness": "unknown",
    "omissions": [
      { "kind": "skill", "reason": "outside_bounded_subset", "count": null },
      { "kind": "tool", "reason": "unknown_coverage", "count": null }
    ]
  },
  "entries": [
    {
      "snapshot": {
        "id": "skill:<stable-host-id>",
        "kind": "skill",
        "name": "<exact invocation name>",
        "description": "<exact public description from current metadata>",
        "enabled": true,
        "explicit_only": false
      },
      "source": {
        "surface": "model_skill_card",
        "reference": "<private reference to this session's observed card>"
      },
      "restriction": {
        "basis": "host_metadata",
        "reference": "<private reference to effective invocation restrictions>",
        "explicit_request": false
      }
    }
  ]
}
```

- `host` is `codex` or `claude-code`. Record the observed `host_version`; `unknown` is allowed only without a documented-default claim.
- `source.surface` is `model_skill_card` for skills or `loaded_mcp_definition` for tools. Its reference identifies the actual local observation. If a truncated model card was enriched from an already advertised skill’s frontmatter, reference both the card and the exact supplemental metadata; do not describe the supplemental text as model-delivered. Retain an auditable reference to the full current MCP definition; only its public selection card enters the catalog.
- `restriction.basis` is `host_metadata` or, for skills only, `verified_host_default`. Defaults require an observed version such as `1.2.3` and a reference to the applicable verified rule. The checker validates the assertion's form, not its truth. Explicit host flags and restrictive session overrides take precedence; absence alone is not evidence of permission.
- `restriction.explicit_request` is boolean. When true, also supply nonempty `explicit_request_reference` identifying the actual local user-invocation evidence. Explicit-only included entries require this. The checker does not interpret intent or authorize arguments.
- `coverage.completeness` is `bounded` or `unknown`, never `complete`. Omission records have `kind: skill|tool`, a reason below, and integer `count` or `null` when unknown. Zero MCP entries require a tool omission even when no definitions were available. Do not equate “not examined” with zero.
- Allowed omission reasons: `outside_bounded_subset`, `disabled`, `explicit_only`, `unresolved_availability`, `unresolved_restrictions`, `deferred_definitions`, `no_current_definitions`, `unknown_coverage`.

Unknown sidecar fields are rejected. Inputs are limited to 2 MB each, 4096 catalog entries and 4096 omission records. Duplicate JSON keys and nonfinite numbers fail closed. Snapshots retain the original catalog fields; descriptions and counts do not claim a complete machine inventory.

## Prepare token and digest, then check

After preparing the catalog and evidence from actual observations, run this from the resolved skill directory. **This preparation writes only the already prepared private sidecar**, filling its local token and canonical catalog digest. It preserves the recorded source snapshots and restrictions; a later mismatch must be corrected from evidence, not by blindly replacing snapshots.

```sh
python3 -B - /private/catalog.json /private/provenance.json <<'PY'
from pathlib import Path
import json
import sys
import uuid
sys.path.insert(0, str(Path('scripts').resolve()))
from hook_catalog import read_json
from jev_advisor import digest
catalog = read_json(Path(sys.argv[1]))
path = Path(sys.argv[2])
evidence = read_json(path)
token = 'capture-' + uuid.uuid4().hex
evidence['capture'] = {'token': token, 'binding': 'agent_asserted_current_session'}
evidence['catalog_sha256'] = digest(catalog)
path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(token)
PY
```

Then use the printed token in the optional continuity check:

```sh
python3 scripts/hook_catalog.py --catalog /private/catalog.json \
  --provenance /private/provenance.json \
  --expected-capture-token capture-example-1
```

Exit zero returns `status: catalog_evidence_consistent`; errors return one with a safe code. Output contains only statuses, hashes and coverage counts, never paths, descriptions, source references, capture tokens or credentials. Omitting `--expected-capture-token` explicitly leaves continuity `not_checked`. The existing advisor parser/retrieval is reused with a fixed inspection query and no caches; this is not task-specific retrieval or semantic advice.

Every pass retains `host_attestation: not_verified`. Internally consistent agent assertions can still be stale or false. Qualification must independently compare actual same-turn host metadata and effective restrictions with this sidecar. A checker pass alone neither proves MCP availability nor qualifies a host/platform.

Correct serialization/consistency errors before any provider attempt. Exclude entries whose evidence remains unresolved and record the omissions; an empty/unusable subset requires native fallback. With reliable current inputs, follow the [offline task check and native approval steps](hook-integration.md#catalog-shape-and-local-check) before a separate Recommend call. Preserve provider budgets and do not replay a failed request.
