# AC-ADR-031: Keep Skill Evaluation Evidence Outside the Runtime Payload

ID: AC-ADR-031
Title: Keep Skill Evaluation Evidence Outside the Runtime Payload
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: evals, runtime-payload, evidence, context
Applies when: Adding skill eval cases, rubrics, transcripts, run evidence, or runtime self-test fixtures.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep maintainer eval proof outside installed skill payloads unless a fixture is required at runtime.

Variants: [Short](ac-adr-031-keep-skill-evaluation-evidence-outside-the-runtime-payload.short.md) · **Long, canonical** · [Guide](ac-adr-031-keep-skill-evaluation-evidence-outside-the-runtime-payload.guide.md)

## Context

Installed agents need operational instructions, references, templates, assets, and helpers. Maintainer eval prompts, rubrics, comparison candidates, transcripts, benchmark corpora, and dated run evidence serve a different audience. Shipping them by default increases payload size and context pressure, can reveal non-public provenance, and may cause an agent to treat test language as runtime policy. Hiding all evals privately, however, removes useful public proof.

## Decision

Skill evaluation cases, rubrics, baselines, comparison protocols, transcripts, run summaries, and promotion evidence live in a maintainer-owned evaluation area outside the default installed skill payload.

The evaluation tree maps each suite to an exact skill name, package path, tested revision or version, host/model/environment when relevant, evidence stage, and known limitations. Public eval material is sanitized and reviewable; secret-bearing, customer, private-source, or restricted raw evidence stays outside public artifacts. Deterministic assertions are distinguished from model- or reviewer-judged results.

A skill may bundle a focused self-test fixture only when its operational workflow consumes that fixture after installation, such as a parser sample, schema conformance input, or known-safe rendering probe. The fixture is minimal, documented as runtime material, validated with the package, and does not carry benchmark transcripts or promotion claims. Generated eval outputs and local run state do not become installed resources accidentally.

Repository validation detects missing skill-to-eval mappings, stale version references, invalid public paths, and accidental eval material in the runtime payload. Promotion and release reviews link to the external evidence without copying it into `SKILL.md`.

## Invariants

- Runtime payload and maintainer proof have separate ownership and install behavior.
- Every evidence claim names the exact subject and stage it supports.
- Bundled fixtures are required by runtime behavior, not merely convenient for maintainers.
- External evals cannot introduce runtime policy that is absent from the skill package.
- Public evals follow the same secret and provenance boundary as other public artifacts.

## Failure handling

Block promotion or a quality claim when its eval mapping is missing, stale, tied to another revision, or cannot be published safely. Remove unintended proof artifacts from the installed package before release, but preserve required runtime fixtures and their direct tests.

## Consequences

Installed skills stay smaller and less likely to absorb test language as instructions. Maintainers must keep external suites synchronized, preserve evidence provenance, and validate the exceptional runtime fixtures that remain inside a package.
