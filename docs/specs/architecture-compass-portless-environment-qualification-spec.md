---
title: "Qualify Portless in managed development environments"
slug: "architecture-compass-portless-environment-qualification"
artifact_path: "docs/specs/architecture-compass-portless-environment-qualification-spec.md"
mode: "standard"
status: "approved"
owner: "stark-ai-de"
repo: "agent-skills"
created: "2026-10-16"
updated: "2026-10-16"
---

# Qualify Portless in managed development environments

## Goal and repository context

Correct every actionable review point in PR #149 and make AC-ADR-066 operational
for maintainers and agents adopting managed local development. The reviewed
baseline is `2e07f79bb4e6edffe6fde7f4435afbdac8c08096`. Its open P2 concerns
inherited Git selectors; the review also requests managed-host configuration,
cross-service proxy-loop guidance and independently managed container aliases.
Canonical skill sources own the Guide; portable copies are generated.

## Scope and non-goals

Update the canonical Guide, executable examples, static evaluation inventory,
focused regressions, a separate isolated runtime qualifier and required derived
metadata. Preserve the accepted decision, existing CA ownership, direct fallback,
network-namespace distinctions and OAuth qualification requirements.

Do not provision the shared host, modify trust stores or hosts files, install
libraries, fork Portless, change application repositories, merge the PR or publish
a release. A Node fixture does not qualify Vite, Docker, browsers, OAuth or native
Windows. No new architecture decision is required.

## Requirements and acceptance criteria

- Clear Git-local selectors returned by `git rev-parse --local-env-vars` only in
  the Git child environment before resolving the launcher's canonical root.
  Foreign `GIT_DIR`, `GIT_WORK_TREE` and `GIT_COMMON_DIR` cannot change identity;
  a missing root fails. Preserve unrelated process/authentication environment.
- Document one owned state directory, HTTPS, port and TLD shared by service and
  clients, explicitly disabling automatic hosts synchronization. Read-only
  diagnostics use `doctor`, `list` and the actual service owner's status.
  Verify live configuration before delegation; stop on missing/mismatched
  prerequisites instead of hidden auto-start, trust repair or competing services.
- Discover cross-service target URLs. Show `changeOrigin: true` and required
  WebSocket forwarding, retaining Node CA configuration at process startup and
  full TLS verification. Explain the 508 failure without Host rewriting.
- Distinguish attached container startup from an independently managed running
  container. Verify readiness and host-loopback-only port publication before
  alias registration. Route cleanup does not stop the container.
- Document v0.15.8's alias overwrite behavior without `--force`, require verified
  ownership/current mapping before mutation and stop on conflicts. Explain that
  ordinary command startup also performs shared-registry orphan cleanup; lack
  of `--force` alone does not establish process/route isolation.

## Implementation and interfaces

1. Persist this approved public spec before implementation and read it back.
2. Correct the canonical AC-ADR-066 Guide; extend launcher-root evaluation and
   add managed-host, cross-service and static-alias scenarios and their inventory.
3. Add `portless-guide.test.mjs` in the Compass validation module and invoke it
   from the existing contract regression entrypoint. Extract the actual Guide
   JavaScript block into temporary Git fixtures instead of maintaining a copy.
4. Add `qualify-portless-guide.mjs` and `pnpm run qualify:portless-guide`. Use the
   existing Portless 0.15.8 executable, optionally selected by `--portless-bin`.
   Fail clearly for unavailable prerequisites/version mismatch; never download.
5. Regenerate portable output with `pnpm run sync:agent-plugin`. Recompute the
   shared planning fingerprint through the existing snapshot function and update
   its maintenance explanation without changing admission or qualification claims.
6. Keep the PR's unpublished Compass 0.12.1 and bundle 1.11.1 while above the
   current base versions. Keep listing/badge aligned. Root release files remain
   with Release Please. Refresh Guide metadata consistently without decision drift.

## ADR gate and source challenge

ADR required: no. Implements existing AC-ADR-066 under ADR-0029 (exclusive
external worktree), ADR-0032 (canonical Long and linked variants), ADR-0041
(changed-contract validation) and ADR-0050 (separate release preparation).
No accepted decision or decision digest may be rewritten.

Decision contract: [AC-ADR-066 Short](../../skills/engineering-workflows/architecture-compass/references/ac-adr-066-use-portless-for-local-development-endpoints.short.md)
([Long, canonical](../../skills/engineering-workflows/architecture-compass/references/ac-adr-066-use-portless-for-local-development-endpoints.long.md) ·
[Guide](../../skills/engineering-workflows/architecture-compass/references/ac-adr-066-use-portless-for-local-development-endpoints.guide.md)).
Repository decision identities and canonical variants are maintained in the
[ADR index](../adrs/README.md).

Primary sources reviewed on 2026-10-16:

- [Git hook environment isolation](https://git-scm.com/docs/githooks#_description).
- [Portless v0.15.8 implementation](https://github.com/vercel-labs/portless/tree/v0.15.8/packages/portless/src),
  especially CLI startup, routes and HTTP/WebSocket hop handling.
- [Review and requested improvements](https://github.com/stark-ai-de/agent-skills/pull/149#pullrequestreview-5544382976).

The exact original Guide snippet reproduced both foreign-checkout selection and
false success outside Git under inherited selectors. A disposable alias probe
also confirmed that a second static alias registration replaces the first
without `--force`. Source review found automatic orphan cleanup and an extra
port-80 redirect listener for HTTPS, so a high main port alone is insufficient
runtime-test isolation. Do not copy third-party skill prose.

## Validation

Executable Git regressions cover root/nested/foreign invocation directories,
same-basename clones and detached worktrees, inherited selectors, missing roots
with clean/foreign environments and preserved unrelated environment.

The runtime qualifier runs in its own Linux user/network namespace with loopback,
temporary state/CA and an owned HTTPS port, including the redirect listener.
Use two Node fixture services and discovered URLs. Verify API identity, HTTP and
WebSocket data with trusted TLS, and a negative 508 control without Host rewriting.
Exercise alias registration/removal while the independent backend, second route
and proxy survive. Timeouts and errors clean up only owned children/state. Report
this as Linux/Node/Portless fixture evidence, not framework or target qualification.
Namespace creation, loopback and both listener types were checked during planning.

Run the affected gates: `validate:architecture-compass`, `validate:adrs`,
`validate:product-planning`, `validate:skills`, `validate:projections`,
`validate:plugin-evals`, `validate:openai`, `validate:scripts`, `smoke:install`,
`format:check`, `lint`, `release:intent` against the verified current base and
`git diff --check`, plus the isolated qualifier. The hosted `validate` gate
must pass for the final pushed head. Keep source, fixture-runtime, hosted and
unperformed target qualification evidence separate.

## User verification, delivery and risks

The maintainer explicitly approved this scope, public spec persistence, isolated
runtime qualification, scoped staging/commit/push and existing-PR update on
2026-10-16. Use the existing PR branch in its assigned external worktree and
preserve concurrent work. Native host permissions remain independent.

Portless's privileged redirect, automatic startup/cleanup and static-alias
semantics require explicit isolation/ownership, not inferred guarantees. Revert
only owned repository changes for rollback; retain shared services/certificates.
Missing prerequisites are failures or pending proof, never passes. No standing
Karakeep project policy exists; do not add setup or upload scope.

## Done when and execution handoff

After saving/reading this spec, implement the authorized changes and run their
checks. Refresh base and every comment before publishing, reconcile new findings,
stage only scoped files, commit and push the existing branch. Check CI for that
exact head; reply to and resolve the fixed thread with evidence. As the last
write, update the PR description with feature/spec/finding mapping, actual results
and limits, then verify read-only. Completion requires the requested artifacts,
all actionable feedback addressed and required final-head checks passing. Merge
and release remain separate.
