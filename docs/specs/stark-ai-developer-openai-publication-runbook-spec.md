# Specification: stark AI Developer OpenAI Publication Runbook and Evidence Workflow

Status: Proposed
Date: 2026-08-18
Repository: `stark-ai-de/agent-skills`
Plugin ID: `stark-ai-developer`
Public display name: **stark AI Developer**
Plugin type: Skills only
Target public version: `1.0.0`
Depends on: [PR #53](https://github.com/stark-ai-de/agent-skills/pull/53), [ADR-0043](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)), and [PR #54](https://github.com/stark-ai-de/agent-skills/pull/54)

## 1. Decision

The repository SHALL provide:

1. an operator runbook for OpenAI submission, review, approval, publication, and clean-account verification; and
2. a manually dispatched GitHub Actions workflow that creates an immutable publication-evidence bundle from one exact source ref.

The workflow SHALL automate repository-controlled proof only. It MUST NOT sign in to OpenAI, accept portal credentials, create a portal draft, upload to the submission portal, complete policy attestations, submit for review, respond to reviewers, select Publish, or claim clean-account verification.

## 2. Source boundary

The repository is authoritative for:

- source files, plugin manifests, versions, listing copy, reviewer cases, public pages, and release notes;
- canonical bundle membership and generated plugin projections;
- validation results, release archives, release manifests, and SHA-256 digests.

The OpenAI Platform is authoritative for:

- selected verified Developer Identity and owning organization;
- country/region availability;
- portal normalization, scan status, review status, approval, and publication state.

A repository marketplace is a development and test channel. It does not create a universal public listing. Approval and publication remain separate states.

Official OpenAI references verified on 2026-08-18:

- <https://developers.openai.com/plugins/deploy/submission>
- <https://developers.openai.com/plugins/deploy/submission-errors>
- <https://developers.openai.com/plugins/build/plugins>
- <https://developers.openai.com/codex/plugins>

## 3. Roles

Before a production run, identify:

| Role | Responsibility |
| --- | --- |
| Technical release owner | Freezes source, runs gates, builds artifacts, records checksums, and prepares review fixes. |
| OpenAI Platform owner | Owns the selected Platform organization, draft, submission, and Publish action. |
| Business/legal owner | Approves publisher identity, claims, legal pages, and availability. |
| Support/security owner | Owns public support and private security-report handling. |

One person MAY hold multiple roles. Every role MUST be represented before submission.

## 4. State model

```text
IMPLEMENTATION_READY
  -> RELEASE_CANDIDATE_READY
  -> PORTAL_DRAFT
  -> SUBMITTED
  -> REVIEW_CHANGES_REQUESTED (optional loop)
  -> APPROVED
  -> PUBLISHED
  -> CLEAN_ACCOUNT_VERIFIED
```

Rules:

- `RELEASE_CANDIDATE_READY` requires green repository gates and a reproducible ZIP.
- `PORTAL_DRAFT` requires the exact ZIP to be uploaded to the correct verified organization.
- `SUBMITTED` requires complete listing, scans, reviewer cases, availability, notes, and attestations.
- Repository-controlled review findings MUST be fixed in canonical source through a reviewed PR.
- `APPROVED` does not mean public.
- `PUBLISHED` requires a separate authorized Publish action.
- Public availability MUST NOT be claimed before `CLEAN_ACCOUNT_VERIFIED`.

## 5. Immutable release candidate

One release candidate MUST bind:

- full Git SHA and source ref;
- plugin ID, display name, and version;
- exact ZIP filename, byte size, and SHA-256;
- release manifest and checksum file;
- the six approved bundle skills;
- exact publisher string;
- website, support, privacy, and terms URLs;
- validation and plugin-eval receipts;
- GitHub workflow run URL;
- identity, permission, legal, availability, and support-owner attestations.

The workflow MUST reject publisher or version drift, non-HTTPS or unavailable public URLs, bundle/package membership drift, failed projection/validation/eval gates, stale release-side metadata, a dirty source tree, and non-reproducible ZIP bytes.

## 6. Manual workflow

Create `.github/workflows/openai-plugin-publication.yml` using `workflow_dispatch` only.

Required inputs:

- source ref;
- expected plugin version;
- exact verified publisher identity;
- publisher verification confirmation;
- Apps Management: Write confirmation;
- legal/public-copy confirmation;
- availability confirmation and countries/regions summary;
- support owner;
- full-validation selection;
- optional tracking issue number.

The workflow SHALL:

1. fail before expensive work when attestations are absent;
2. check out the exact ref with full history;
3. install frozen dependencies;
4. run projection drift, plugin validation, and plugin evals;
5. optionally run the full repository aggregate and always run formatting and linting;
6. validate plugin identity, listing limits, publisher, public URLs, bundle, and packaged skills;
7. build the OpenAI package twice from clean release-output directories;
8. require byte-identical ZIPs and identical SHA-256 digests;
9. verify the release checksum and manifest bind the ZIP to the selected commit;
10. create JSON and Markdown evidence plus the archive file list;
11. upload the evidence as a bounded GitHub artifact;
12. optionally post a sanitized summary to a tracking issue.

Permissions SHALL be limited to `contents: read` and optional `issues: write`. The job SHALL use the `openai-plugin-publication-readiness` environment so maintainers can configure reviewers.

## 7. Evidence artifact

The workflow output SHALL contain:

```text
publication-evidence/
├── publication-evidence.json
├── publication-evidence.md
├── publication-evidence.schema.json
├── archive-file-list.txt
├── SHA256SUMS
└── artifacts/
    └── <exact files copied from dist/openai/>
```

`publication-evidence.json` SHALL validate against:

```text
docs/plugins/stark-ai-developer/publication-evidence.schema.json
```

The evidence MUST NOT contain credentials, private portal messages, customer data, private repositories, or clean-account identifiers.

## 8. Publisher and listing gate

Before a production run:

1. select the long-term owning OpenAI Platform organization;
2. confirm the submitter has Apps Management: Write or equivalent owner access;
3. complete individual or business verification;
4. copy the exact Developer Identity label from the portal;
5. reconcile that label with `author.name`, `interface.developerName`, public pages, and listing worksheet through a reviewed PR;
6. obtain legal approval for listing, privacy, terms, support, and availability.

The workflow input is an attestation and consistency check; it cannot prove external Platform state.

At specification time, enforce these public-directory limits:

- package name: 64 characters;
- display name: 30;
- short description: 30;
- long description: 4,000;
- developer name: 80;
- up to 20 capabilities, each one line and 120 characters;
- up to three unique one-line starter prompts, each 128 characters and without an `@mention`.

The portal draft MUST detect exactly the six approved skills. Maintain at least five positive and three negative reviewer cases; the repository SHOULD retain one positive case for every bundled skill.

## 9. Operator procedure

The detailed procedure is normative operational guidance at:

```text
docs/plugins/stark-ai-developer/publication-runbook.md
```

It covers:

- role assignment and publisher verification;
- public URL and legal approval;
- workflow dispatch and evidence inspection;
- Skills-only portal draft creation;
- portal normalization and scan disposition;
- reviewer cases and attestations;
- repository-first review fixes and versioning;
- separate approval and Publish actions;
- clean-account discovery, install, smoke, update, and uninstall verification;
- post-publication status updates and rollback.

## 10. Review-finding loop

Repository-controlled findings MUST follow:

```text
finding
  -> issue/checklist entry
  -> canonical source fix
  -> reviewed PR
  -> version decision
  -> projection regeneration
  -> validation and evals
  -> new deterministic ZIP and checksum
  -> replacement upload and rescans
```

Never patch only generated skill copies or leave the portal and repository with materially different public metadata.

## 11. Security and privacy

The workflow MUST use no OpenAI secret and no browser automation. It SHALL not mutate the selected source commit or publish external state. Artifacts SHALL have bounded retention and contain only public release material and sanitized evidence.

Clean-account evidence SHALL record only surface, client/plugin version, prompt or case ID, selected skill, summarized result, pass/fail, date, and known variance. It MUST NOT store chain-of-thought, credentials, complete private repositories, or personal account identifiers.

## 12. Acceptance criteria

- [ ] This specification is indexed under `docs/specs/`.
- [ ] The detailed runbook and evidence schema exist under `docs/plugins/stark-ai-developer/`.
- [ ] The workflow is manual-only and contains no OpenAI credentials or portal automation.
- [ ] Human identity, permission, legal, availability, and support gates are required.
- [ ] The selected commit must be clean and match the requested SHA.
- [ ] Plugin drift, validation, eval, formatting, linting, and optional aggregate gates are represented.
- [ ] Two package builds must be byte-identical.
- [ ] The evidence binds version, source, ZIP, checksum, six skills, publisher, URLs, and workflow run.
- [ ] An optional tracking issue receives only a sanitized summary.
- [ ] Submission, review, approval, Publish, and clean-account verification remain human-controlled.
- [ ] Approval and publication remain separate states.

## 13. Done when

This specification is implemented when an authorized maintainer can dispatch one workflow against an immutable ref and receive a validated, reproducible, URL-checked publication-evidence bundle containing the exact ZIP intended for OpenAI submission.

Public launch remains complete only after the verified publisher submits that ZIP, OpenAI scans and review pass, the publisher explicitly selects Publish, and a clean eligible account verifies public discovery and supported ChatGPT/Codex installation behavior.
