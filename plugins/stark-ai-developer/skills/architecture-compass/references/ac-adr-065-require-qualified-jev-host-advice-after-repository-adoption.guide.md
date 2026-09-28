# AC-ADR-065: Require Qualified Jev Host Advice after Repository Adoption

ID: AC-ADR-065
Title: Require Qualified Jev Host Advice after Repository Adoption
Status: Accepted
Date: 2026-09-26
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: jev, host-advice, adoption, authorization, eligibility, qualification
Applies when: A repository elects to require qualified Jev capability advice through explicitly authorized agent hosts.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-26
Gist: Require Jev advice in adopting repositories while keeping activation, processing authority, current eligibility, qualification, and native fallback separate.

Variants: [Short](ac-adr-065-require-qualified-jev-host-advice-after-repository-adoption.short.md) · [Long, canonical](ac-adr-065-require-qualified-jev-host-advice-after-repository-adoption.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls.

## Setup and adoption

Use the existing `setup/recommended` or `setup/complete` workflow. For recommended coverage, require target evidence that this repository wants a Jev advice obligation; availability of Jev alone is insufficient. For complete coverage, give this candidate one `adopt`, `adapt`, `defer`, or `reject` disposition. Keep the initial foundation exactly AC-ADR-005, 006, 018, 019, 021, 022, and 049 for new or evidence-empty repositories.

Allocate the target's native ADR identity and record its provider mapping. Record the local rule, authorized host/repository scope, configuration owner, processing authority and approved metadata scope, current eligibility source, qualification receipt, and missing prerequisites. An accepted local rule can coexist with an unmet operational obligation. A defer names its owner and revisit trigger; adoption does not silently choose a host or process repository data.

Preserve the five public workflows. Governance setup can persist the authorized local ADR, mapping, and instruction references; it does not authorize a provider call, global installation, configuration changes, hook trust, credential changes, or application refactoring.

## Operational evidence

Keep one evidence row per authorized host and repository scope. Record a source, observation time, invalidators, and `verified`, `failed`, `not run`, `unavailable`, or `stale` status for each dimension:

| Dimension                      | Evidence to inspect                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository adoption            | Accepted local ADR, provider mapping, applicable scope and adaptations                                                                                    |
| Installed                      | Available advisor and integration artifact identity; installation alone proves no activation                                                              |
| Configured                     | Reviewed registration or rendered fragment and its configuration owner                                                                                    |
| Effectively active and trusted | Actual host loading, normal trust state, and observed fixed reminder delivery                                                                             |
| Processing authority           | Existing explicit permission for this host, repository, minimal summary, and approved metadata scope                                                      |
| Current inventory              | Current host evidence, coverage limits, invocation/account restrictions, and explicit user choices                                                        |
| Practically qualified          | Exact host/version/platform, advisor/runtime identity, effective configuration, model/reasoning, native advice/disposition/order and failure observations |
| Unmet obligation               | Missing or stale evidence, native fallback, owner, and next authorized follow-up                                                                          |

An installed skill, `hooks` entry, unit fixture, or prior session does not fill another row. A metadata list may establish only a bounded observed inventory; label its limits. Do not infer that absent restrictions mean a capability is eligible. Check explicit choices and recommended IDs against the same current evidence before execution.

## Codex policy fragment

From the installed Jev advisor directory, the pure renderer is:

```sh
python3 scripts/jev_hooks.py render --host codex --policy repository-adopted
```

Review its JSON fragment through the existing configuration owner. It is not a replacement configuration file. Applying or removing it, avoiding duplicate registrations, and normal host trust require the owner's authority and existing configuration management; preserve unrelated hooks and any installer-owned state. This Guide does not authorize those operations.

Use the maintained [Jev repository-adopted hook procedure](https://github.com/stark-ai-de/agent-skills/blob/main/skills/skill-maintenance/jev-capability-advisor/references/hook-integration.md#repository-adopted-policy). Rendering configuration is distinct from activating or qualifying it. This policy does not claim Codex CLI, Desktop, Claude Code, or any platform is already qualified.

## Consultation and fallback

When all applicable prerequisites have current evidence, bootstrap with current eligible capabilities and a minimal approved task summary, then consult using `general/current`. The fixed reminder starts model-mediated reasoning; it does not contain provider advice before the first model step. Keep the existing advisor limits and `selected`, `none`, `clarify`, `incomplete`, and `error` dispositions. The host decides whether to act, checks IDs and restrictions, and preserves explicit user choices.

A new actionable task or a material task-scope/capability change needs fresh advice. Unchanged continuation, status, confirmation, and consultation messages do not. Treat changed restrictions or unknown continuity as reasons to re-establish evidence, not to label old advice current. Do not add retries or repeatedly emit unchanged gap reports.

Use a concise gap receipt when needed: `Jev policy obligation unmet: current eligibility unavailable; continuing with native selection.` Name the actual missing authority, credential, integration, qualification, or provider result. Keep otherwise authorized work moving. Never write a catalog, cache, receipt, or configuration to bypass Plan or read-only restrictions; fall back when valid inputs cannot be prepared by an allowed path.

## Read-only audit

Select `audit` from an audit request, inspect the local mapping and available evidence, and report each dimension separately. Report gaps, stale observations, changed host/runtime/model/configuration, and their effect on the compliance claim. Audit makes no provider request and does not install, render-to-file, activate, trust, qualify, repair, or write a receipt. A requested report is returned in the conversation. Any later remediation or qualification needs its own authorized workflow.

## Qualification and requalification

A qualified receipt identifies the exact host/version/platform, runtime source, effective configuration and trust, synthetic capability inventory, model and reasoning setting. Observe native delivery, real helper invocation, advice disposition, and first substantive work in that order. Exercise adopted versus non-adopting contexts, missing authority, material changes versus unchanged continuation, restrictions, missing credentials, provider failure/timeout/cancellation, policy removal, outgoing-data minimization, and Plan/read-only behavior.

Controlled transport fixtures establish bounded behavior only. Record a separately authorized genuine TypeSafe consultation with synthetic data for the claimed integration; missing credentials or inventory evidence leave it incomplete. Retain all attempts and mark unobserved cases `not run` or `unavailable`. Do not expand results to another host, platform, model, reasoning level, configuration, or inventory source. Requalify after material drift. No speed, quality, token-saving, or deterministic-redaction claim follows from a reminder or one smoke.

Removing a fragment preserves native work but does not erase the adopted obligation. Record the gap and follow the owner's configuration management for any authorized rollback.

## Decision lineage

- `adapts`: [ADR-0058](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0058-require-qualified-jev-host-advice-after-repository-adoption.long.md).

## Revisit

Revisit when host trust or current-inventory semantics change, a new host is qualified, processing scope changes, or native observations invalidate trigger, minimization, or fallback behavior. Use a successor for a changed durable obligation; keep operational evidence in maintained receipts.
