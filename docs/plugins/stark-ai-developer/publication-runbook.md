# stark AI Developer OpenAI Publication Runbook

This runbook turns a reviewed repository release candidate into an auditable OpenAI submission. It does not automate OpenAI's portal, review, approval, Publish action, or clean-account verification.

Normative automation contract: [`../../specs/stark-ai-developer-openai-publication-runbook-spec.md`](../../specs/stark-ai-developer-openai-publication-runbook-spec.md)

## 1. Assign owners

Record:

- technical release owner;
- OpenAI Platform owner;
- business/legal owner;
- support/security owner.

Confirm the selected OpenAI Platform organization is the long-term owner of the public listing.

## 2. Confirm Platform access and publisher identity

In the owning OpenAI organization:

1. give every non-owner submitter **Apps Management: Write**;
2. complete individual or business verification;
3. copy the exact publisher label shown in the Developer Identity selector;
4. compare it with the plugin manifest, landing page, privacy, terms, support page, and listing worksheet;
5. use a reviewed repository PR to correct any mismatch.

Never store Platform credentials, session cookies, MFA codes, or tokens in GitHub.

## 3. Approve public copy and availability

The business/legal owner must approve:

- publisher identity;
- short and long descriptions;
- capabilities and starter prompts;
- privacy and terms;
- support and security-report routes;
- countries/regions where support and legal terms are ready.

Test every public URL while logged out:

```bash
curl -fsSL -o /dev/null https://stark-ai-de.github.io/agent-skills/plugins/stark-ai-developer/
curl -fsSL -o /dev/null https://stark-ai-de.github.io/agent-skills/plugins/stark-ai-developer/privacy/
curl -fsSL -o /dev/null https://stark-ai-de.github.io/agent-skills/plugins/stark-ai-developer/terms/
curl -fsSL -o /dev/null https://stark-ai-de.github.io/agent-skills/plugins/stark-ai-developer/support/
```

Do not claim public availability yet.

## 4. Prepare an immutable release candidate

Use a merged commit or release tag, not an uncommitted worktree.

Run the manual GitHub workflow:

```text
Actions -> Prepare stark AI Developer OpenAI publication -> Run workflow
```

Supply:

- the exact tag/commit/branch ref;
- expected plugin version;
- exact verified publisher label;
- all required attestations;
- approved countries/regions summary;
- support owner;
- optional tracking issue.

The workflow runs plugin drift, validation, eval, optional aggregate, formatting, linting, two-build reproducibility, public URL checks, and evidence generation.

Download the resulting artifact:

```text
stark-ai-developer-publication-evidence-<version>-<short-sha>
```

Verify it contains:

```text
publication-evidence.json
publication-evidence.md
SHA256SUMS
artifacts/<release ZIP and release-side files>
```

Independently recompute the ZIP checksum:

```bash
sha256sum artifacts/*.zip
```

It must match both `SHA256SUMS` and `publication-evidence.json`.

## 5. Inspect the archive

Before upload:

```bash
unzip -l artifacts/*.zip
```

Confirm:

- one valid plugin root;
- exactly six bundled skills;
- no `.git`, dependencies, incubator files, bootstrap files, secrets, private paths, or unsupported filesystem entries;
- correct manifest, assets, license, README, and source manifest.

## 6. Create the portal draft

In the selected OpenAI organization:

1. open the plugin submission portal;
2. select **Create plugin**;
3. choose **Skills only**;
4. record the draft ID;
5. upload the exact ZIP from the evidence artifact;
6. compare the uploaded file's SHA-256 again before selection.

## 7. Reconcile portal normalization

Review every normalized field and warning.

Confirm exactly these skills are detected:

```text
animated-readme-logo
architecture-compass
codegraph-ast-grep
codex-memory-curator
codex-spec-interviewer
drawio-diagrams
```

If a material portal value differs from the repository:

1. stop;
2. record the difference;
3. decide whether it is acceptable;
4. fix the repository through a PR;
5. bump version where required;
6. rebuild and rerun the publication workflow;
7. upload the replacement ZIP.

## 8. Complete the listing

Fill from the reviewed manifest and listing worksheet:

- plugin name and descriptions;
- verified Developer Identity;
- category and capabilities;
- logo;
- website, support, privacy, and terms;
- up to three starter prompts;
- approved countries/regions;
- release notes.

Recheck current portal limits immediately before submission.

## 9. Enter reviewer cases

Provide at least five positive and three negative cases. The repository should retain one positive case for each of the six bundled skills.

Every case must state:

- prompt;
- surface/product;
- expected skill;
- expected result shape;
- fixture when needed;
- prohibited behavior.

Use public or synthetic fixtures only.

## 10. Review scans

Treat:

- errors as blockers;
- warnings as findings that require explicit disposition;
- pass as evidence that still needs skill-count and content confirmation.

For repository-controlled findings, fix the canonical source first and create a new reviewed release candidate.

## 11. Submit for review

Before selecting **Submit for Review**, confirm:

- Apps Management access;
- verified identity;
- exact ZIP checksum and source SHA;
- six detected skills;
- scans reviewed;
- reviewer cases complete;
- availability approved;
- release notes complete;
- attestations accurate.

Record the submission ID, submitter, time, version, source SHA, and archive SHA-256.

Submission is not publication.

## 12. Address review findings

Classify each finding:

- clarification only;
- metadata/asset;
- skill behavior/security;
- legal/business.

Any repository-controlled change must follow:

```text
canonical fix -> reviewed PR -> version decision -> projection sync -> tests -> new ZIP -> new checksum -> re-upload
```

Never patch only generated skill copies.

## 13. Approve publication

After OpenAI marks the version approved:

1. compare approved version, publisher, skills, availability, source SHA, and archive SHA-256;
2. obtain technical approval;
3. obtain business/legal approval;
4. record publish authorization.

Approval is still not publication.

## 14. Publish

The authorized Platform owner:

1. opens the approved version;
2. confirms the identity and version;
3. selects **Publish**;
4. records publication time and portal state.

## 15. Verify with a clean account

Use an eligible account that did not create the submission and has no repository marketplace or cached developer installation.

Verify:

1. public search for **stark AI Developer**;
2. correct publisher, logo, category, copy, links, and version;
3. ChatGPT installation and new-chat activation;
4. Chat-compatible positive and negative cases;
5. Codex plugin-browser installation;
6. a new Codex session with all six skills;
7. CODEX-only boundaries;
8. no unapproved mutation or publication;
9. uninstall removes the plugin bundle;
10. later update behavior through a separately reviewed patch release.

Store only sanitized result summaries—never credentials, private repositories, or chain-of-thought.

## 16. Record public status

Only after clean-account verification, open a documentation PR that records:

- actual publication date;
- version;
- verified publisher;
- source commit/tag;
- archive SHA-256;
- tested surfaces;
- known limitations.

Until then, keep public wording at `release candidate`, `in review`, or `not publicly published`.
