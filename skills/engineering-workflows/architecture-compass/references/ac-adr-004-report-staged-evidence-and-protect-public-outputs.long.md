# AC-ADR-004: Report Staged Evidence and Protect Public Outputs

ID: AC-ADR-004
Title: Report Staged Evidence and Protect Public Outputs
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: quality-delivery
Tags: evidence, public-safety, delivery
Applies when: Architecture Compass reports validation, completion, release readiness, deployment, or content intended for persistence or publication.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Tie every claim to its actual evidence stage and keep secrets and private provenance out of public artifacts.

Variants: [Short](ac-adr-004-report-staged-evidence-and-protect-public-outputs.short.md) · **Long, canonical** · [Guide](ac-adr-004-report-staged-evidence-and-protect-public-outputs.guide.md)

## Context

Local commands, remote CI, package publication, deployed behavior, and third-party state are different evidence surfaces. Collapsing them into “validated” or “done” creates false confidence. Public skills also risk leaking private provenance when task-specific paths, hostnames, customer data, or secret-bearing output are copied into reusable artifacts.

## Decision

Architecture Compass classifies every material verification claim into exactly one evidence stage:

- `source/static`: current files, diffs, configuration, schemas, or static analysis inspected without executing the behavior;
- `local`: commands or scenarios executed in the current local environment;
- `CI`: a named remote pipeline run tied to the relevant revision;
- `publication/install`: a package, release artifact, registry, or install path verified independently of its source tree;
- `deployed/production`: behavior observed on the intended deployed environment and revision;
- `external/third-party`: state or behavior observed on a separately controlled platform.

Each reported check uses one status: `verified`, `failed`, `not run`, `unavailable`, or `stale`. It identifies the subject and revision when relevant, command or observation source, result, time or freshness boundary, and material limitations. Evidence from one stage does not establish any later or different stage. A final “completed” claim means only that the approved slice and its declared acceptance criteria are complete at the stated stages.

Before persisting or publishing content, classify its audience:

- Secret values, tokens, credentials, private keys, and sensitive environment contents are forbidden in prompts, commands, tool output repeated into reports, repository artifacts, examples, and public outputs. Refer to approved secret names, references, or configuration paths instead.
- Public persisted artifacts must not contain customer data, private repository paths or links, internal hostnames, or private comparison and evaluation provenance. Normalize them to neutral placeholders and public primary sources.
- An authorized task report may name an exact private target path or repository-relative file when necessary to define the approved boundary or make a current finding actionable. That permission does not extend to public reusable files.
- Sanitization preserves the technical constraint; it does not erase evidence limitations or invent public proof.

Subagent, cached, historical, or prior-run evidence is provisional until reconciled with current state. Stale evidence may explain context but cannot support a current verification claim.

## Invariants

- Every material claim names its evidence stage and honest status.
- Local success is never described as CI, published, deployed, production, or third-party success.
- A health check is not proof of a feature path unless that exact behavior is the acceptance criterion.
- Skipped, unavailable, and stale checks remain visible.
- Secrets are referenced by safe identifier or path, never reproduced by value.
- Public sanitization is applied before content enters a tracked public skill, example, fixture, test snapshot, changelog, or release note.
- Final evidence reflects reconciled current artifacts, not only intended edits or delegated summaries.

## Conflict resolution

When two evidence sources disagree, prefer the source tied most directly to the claimed subject, revision, environment, and time; report the disagreement rather than merging results. A later stage does not erase a failed required earlier gate, and a local reproduction does not override current deployed evidence. Audience-safety rules limit what can be disclosed even when the underlying evidence is valid.

## Failure handling

If a required stage cannot be observed, mark it `unavailable` or `not run`, state the reason, and keep readiness or completion bounded accordingly. If evidence is not tied to the current revision or changed after collection, mark it `stale`. If a secret or private identifier appears in a draft public artifact, stop publication, remove the value from the artifact and any generated copies within the authorized boundary, and re-run the relevant checks without echoing it.

## Acceptance criteria

- Validation and completion reports enumerate required checks with stage and status.
- Every `verified` claim points to current, inspectable evidence for the stated subject.
- Required unverified stages are explicit blockers or residual risks rather than omissions.
- Public skill payloads and release-facing text contain no secrets, customer data, private paths or links, internal hostnames, or private provenance.
- Authorized private task paths are confined to task-scoped reporting and do not leak into reusable artifacts.
- Delegated and historical results are reconciled or labeled stale, missing, or unused.

## Consequences

Reports become more precise and sometimes less celebratory because they expose proof gaps. This protects release and production claims, makes later verification straightforward, and prevents private task context from becoming public skill content.
