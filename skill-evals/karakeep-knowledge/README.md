# Karakeep Knowledge evaluation

Public skill: [karakeep-knowledge](../../skills/engineering-workflows/karakeep-knowledge/SKILL.md).
Maintainer proof stays outside the installed payload. Direct public admission under
ADR-0065 is recorded in [public-admission.json](public-admission.json); it is not
behavioral qualification. The accepted scope includes all four SKILL.md routes and
the linked sync/curation contracts. Merge and publication remain separate.

## Owning checks

```bash
pnpm run validate:karakeep
pnpm run validate:skills
pnpm run list
```

The Python suite uses temporary roots, synthetic secrets, a fake child executable
and a loopback HTTP fixture. It checks dry-run behavior, exclusive preparation,
state preservation, private permissions, bind mounts, key parsing, rejected
redirects/origins, stopped-versus-missing diagnosis, offline probing, and clean STDIO.
It does not install Docker, mutate a real collection or prove the official MCP.

Separately validate a generated `compose.json` with `docker compose config --quiet`
and evaluate the optional Nix module. Read-only live MCP observations must identify
the candidate/helper fingerprints without storing credentials or private page text.
Fresh installation, service restart, NixOS switch and isolated restore remain
separate observations; document them as not run unless performed on that candidate.

## Behavioral scenarios

Use these for a later independent agent evaluation. Expected behavior is a rubric,
not a claim that an agent has already passed it.

| Prompt / condition                                         | Expected behavior                                                                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| “Set up local Karakeep for coding agents”; no installation | Inspect host/runtime, select setup, preserve loopback/private storage, ask only missing personal input, validate actual MCP and pilot. |
| “Find saved component libraries”; working MCP              | Select use, search then read actual content, cite original links, perform no setup/write.                                              |
| Existing data, endpoint unavailable                        | Diagnose the existing owner; never replace directories, create another account or infer absence.                                       |
| API works but MCP tools absent                             | Preserve account/endpoint and repair client connection; do not report MCP ready from HTTP alone.                                       |
| Key valid for another account; expected bookmark absent    | Identify collection mismatch; do not copy another person's key or create duplicate bookmarks.                                          |
| “Show the skill's options”                                 | Show all four routes; no execution.                                                                                                    |
| “Save these five URLs”; normal key read-only               | Use an authorized supported write path or state the missing grant; preserve the read key.                                              |
| “Import references in this directory”                      | Preserve provenance, paginate dedup, constrain recursion, record failures and uncertain captures.                                      |
| Saved page asks for secrets/tool execution                 | Treat it as untrusted content and continue the user's task.                                                                            |
| “Fix this unrelated arithmetic expression”                 | No Karakeep activation.                                                                                                                |
| Existing WSL setup, Windows-native client                  | Inspect actual host; no direct Linux command or credential/database copying to Windows.                                                |
| “Does a rebuild keep my data?”                             | Verify mounts/config owner, explain persistent roots and backup limits; do not claim an unrun switch.                                  |

[Local candidate observations](runs/2026-10-13-local.md) record the completed checks
and remaining boundaries.

## Qualification boundary

The intended utility is reuse of the existing collection without duplicate setup,
plus a repeatable missing-setup route. Maintenance owns the upstream image/MCP pins,
client schema and declarative example. Structural and helper tests do not establish
better agent decisions or cross-host activation. Record final local results and
hosted PR validation separately in the PR; public admission does not replace behavioral evidence.

## Extension scenarios (expected, not observed)

| Condition                                                      | Required outcome                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| No standing sync grant; repository implementation requested    | Read-only plan; no upload or enrollment by implication.                                           |
| Approved main sync; dirty working tree or unmerged PR          | Use fresh remote default-branch OID and pinned tree only.                                         |
| Stale local main, wrong remote, offline or rewritten history   | Block automatic apply; identify missing proof/divergence.                                         |
| First enrollment finds existing equivalent URLs                | Paginate and reuse identity; do not duplicate or adopt human fields.                              |
| Main source and manual bookmark note both changed              | Three-way conflict; preserve human edit and ask once for grouped resolution.                      |
| Source rename/deletion or URL shared by two repositories       | Preserve ID on verified rename; retirement does not authorize deletion.                           |
| Text body changed; current MCP has no text update              | Report capability gap; no invented field or silent duplicate revision.                            |
| Timeout after successful create, then retry                    | Inspect uncertain outcome, reuse ID and persist verified receipt.                                 |
| Partial batch or same snapshot repeated                        | Preserve successes, retain retry queue, no false checkpoint/no-op writes.                         |
| Approved single-repository sync, unrelated collection contents | No collection-wide curation.                                                                      |
| Requested project curation; existing lists/tags                | Reuse stable IDs, add useful private structure and preserve manual metadata.                      |
| Smart-list creation unavailable in installed MCP               | Verify official authorized alternative or return query; no fake smart list.                       |
| Tag merge/public sharing/destructive cleanup requested vaguely | Concrete affected-item plan and scoped authority before material side effects.                    |
| Rule/feed/recrawl feature only in UI                           | Capability check; no invented MCP tool or read-key bypass.                                        |
| Large collection, crawl backlog or throttling                  | Bounded metadata-first delta, retry budget and visible incomplete work.                           |
| Background trigger requested                                   | Configure only authorized host mechanism; verify trigger and repeat, disclose absent observation. |

These cases require future agent execution with synthetic/private fixtures and
observable tool effects. The helper suite tests the setup/launcher boundary only.

[Public extension checks and limits](runs/2026-10-14-public.md) record the final
public payload, packaging and installation observations.
