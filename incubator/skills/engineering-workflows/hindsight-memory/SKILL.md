---
name: hindsight-memory
description: Set up, diagnose, enable or use project-scoped Hindsight memory without requiring Greppy. Use when the user requests local project memory, qualified session retention or source-backed reflection. Not for global memory cleanup or automatic ingestion of every repository.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
  internal: true
---

# Hindsight Memory

## Goal

- Use Hindsight independently for approved project memory.
- Greppy may display its readiness, but is not a runtime requirement.
- This candidate remains in the incubator until fresh-install and fresh-client qualification are recorded.

## When to use

- Use for explicit local project-memory setup, diagnosis, enablement, retention, recall or reflection through Hindsight.

## When not to use

- Do not use for global memory cleanup, arbitrary transcript uploads, document synchronization owned by Karakeep, or implicit memory enablement during search setup.

## Workflow selection

| Workflow | Outcome                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------- |
| `setup`  | Inspect/adopt the owner and prepare a pinned local service and client connection                   |
| `doctor` | Read configuration, running image/route and qualification without repairs or model calls           |
| `enable` | Enable one explicitly approved project after synthetic qualification, or disable its future intake |
| `use`    | Perform explicitly authorized retention, recall or reflection in the selected bank                 |

- For clear authorized intent, announce the route and proceed.
- For a bare invocation or options request, show all four.
- Options alone authorize no action.

## Inputs to inspect

- Inspect host/platform, existing service and package owners, endpoint, exact project and session roots, model route, current account/credentials and client tools.
- Read the [setup and qualification guide](references/setup.md).
- Never create a second service/account to work around a connection failure.
- Private configuration, transcripts and runtime state stay outside source repositories and the Nix store.

## Workflow

### setup

1. Reuse a deployed Hindsight instance when its owner, immutable image and privacy
   contract match. Otherwise prepare the pinned Compose template through the host
   owner. Review storage, ports, credentials and model processing before activation.
2. Initialize private model settings with `scripts/initialize.py`. Select the
   namespace and provider explicitly. New setups default to BGE-M3 embeddings;
   preserve an existing qualified embedding model. HTTPS is required for an
   external gateway unless its exact HTTP route was explicitly accepted.
3. Resolve every placeholder in `assets/project.example.json` into a private
   mode-0600 policy. Record the approved project/content/provider scope. No marker
   or skill installation is permission to ingest sessions.
4. Qualify synthetic retain/readback, project isolation, private raw-text behavior
   and embedding dimensions. Compare declared and actually running model routes.
   Use `enable` only after those checks pass; verify a fresh client connection.

### doctor

- Run `python3 scripts/project_scope.py doctor --policy /absolute/private/project.json`.
- It reads selected private files and Docker metadata; it does not start services, invoke models, retain content, migrate data or create receipts.
- Report its scoped route/enablement result separately from retrieval quality and freshness.
- Missing host access is unverified, not proof the service failed.
- Legacy unbound pilot markers do not qualify the new project workflow.

### enable

- Review the exact root, bank, content scope and provider/privacy acceptance.
- The project policy must record consent.
- Run `scripts/project_scope.py enable --policy POLICY --evidence EVIDENCE` to preview, then add `--apply` within that authority.
- Evidence must match the current effective route fingerprint and all required synthetic checks.
- The helper does not independently prove human-entered results.
- An unchanged repeat is a no-op.
- A changed route requires reviewed qualification; disable the old marker before enabling new evidence.
- `disable` also previews and requires `--apply`; it leaves stored memories and queued records in place.

- For Codex automation, pass `--policy POLICY` to the session hook, weekly worker and MCP launcher.
- Preserve an existing hook chain.
- Qualify one actual trigger; prompt instructions alone are not an automatic schedule.
- The hook records only eligible session references, and each worker call rechecks route qualification.

### use

- Use the selected bank's actual MCP tools.
- Recall first when relevant; distinguish stored observations from current repository truth.
- Retain only authorized content and verify result status, nonempty memory IDs and readback.
- Use synchronous retain: asynchronous queues can persist raw input.
- Reflection needs source IDs and explicit uncertainty; a synthesized answer is not new verified project policy.

## Safety rules

- Preserve private file permissions, worker UID/GID, input validation, secret
  rejection and source-backed reflection checks when packaging helpers.
- Never widen credentials, select a paid/external provider or ingest another
  project implicitly. Local storage does not make model processing local.
- Raw-text enforcement uses a pinned upstream internal interface. Requalify it
  when changing Hindsight. Bank boundaries and client access must be tested.
- Diagnose with known read-only routes. Do not use the LLM health endpoint for
  routine diagnosis: it can make a real provider call.
- Legacy helper defaults exist only for a reviewed compatibility migration; new
  setups always use an explicit project policy and namespace.

- Report setup, qualification, enablement, real trigger and observed usefulness separately.
- A healthy endpoint or old activation marker is not complete readiness.

## References

- Use [setup and qualification](references/setup.md) and the private policy example in `assets/project.example.json`.
- The Compose and parser assets pin upstream 1.2.1.

## Scripts

- `project_scope.py` previews enable/disable and diagnoses without writes; `--apply` performs the selected enablement change.
- `initialize.py` creates private settings without overwriting.
- `build_parser.py` previews, then downloads/builds only with `--apply`.
- The hook/weekly/MCP helpers require an explicitly adopted project policy for new installations.
- `activate.py` exists only for legacy migration compatibility.

## Output format

- Report selected workflow and project, existing owner, changes or exact next steps, qualification evidence, enablement status and remaining limits.
- Never print secrets.

## Completion criteria

- The selected workflow is verified at its own layer; setup/enablement are not called complete from a health check.
- New automation has a tested trigger and exact scope.

## Failure modes

- Stop affected intake on missing consent, changed binding, private-file violations, unqualified image or incomplete extraction.
- Preserve pending records and data.
- Report blocked host access separately and route repairs through the existing owner.
