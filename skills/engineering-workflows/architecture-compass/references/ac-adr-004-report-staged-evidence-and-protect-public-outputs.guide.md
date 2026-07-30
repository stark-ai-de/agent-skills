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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Tie every claim to its actual evidence stage and keep secrets and private provenance out of public artifacts.

Variants: [Short](ac-adr-004-report-staged-evidence-and-protect-public-outputs.short.md) · [Long, canonical](ac-adr-004-report-staged-evidence-and-protect-public-outputs.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Evidence table

Use a table that preserves boundaries:

| Check               | Stage               | Status      | Subject or revision | Evidence           | Limitation           |
| ------------------- | ------------------- | ----------- | ------------------- | ------------------ | -------------------- |
| Focused validator   | local               | verified    | working tree        | command and exit 0 | does not prove CI    |
| Pull request checks | CI                  | not run     | pending commit      | none               | local result only    |
| Public install      | publication/install | unavailable | unreleased version  | none               | requires publication |

Prefer exact statements such as “the local validator passed against the current working tree” over “the release is validated.” Name skipped gates and who or what can supply them.

## Reconciliation checklist

1. Re-read final changed files and status.
2. Map each acceptance criterion to a direct check and evidence stage.
3. Confirm delegated outputs still match the final artifact.
4. Separate current checks from historical context.
5. Record failures, skips, and unavailable environments.
6. State what the collected evidence does not prove.

## Public normalization examples

| Task-scoped input               | Public reusable form                                 |
| ------------------------------- | ---------------------------------------------------- |
| Private checkout path           | `<repo>/<path>` or a repository-relative placeholder |
| Internal service hostname       | `<service-host>`                                     |
| Customer or tenant name         | `<tenant>`                                           |
| Domain object or API path       | `<entity>`, `<resource>`, or `<resource-path>`       |
| Secret value                    | approved SecretRef or variable name only             |
| Private benchmark or comparison | public requirement and public primary source only    |

Do not paste raw command output into a public artifact merely to prove a check. Summarize the relevant result, preserve a safe local evidence path when authorized, and remove incidental environment details.

## Public contract versus private provenance

Preserve the public information required to use, inspect, or verify a capability: official primary sources, schemas, setup and probe instructions, provider and dependency details, licenses, limitations, and reproducible public evidence. Keep maintainer-private repository names and paths, private mappings, named comparison or inspiration targets, detailed challenge notes, and identifying raw artifacts out of reusable public files.

Audit the complete tracked release surface rather than only the changed skill folder. Sanitization is invalid when it removes an official source, license obligation, required provider detail, or reproducibility instruction together with private provenance.

## Incident response for accidental exposure

Stop further propagation, identify affected artifacts without repeating the value, follow the repository's credential-rotation and history-remediation process, and re-run validation with sanitized fixtures. Deleting a visible line alone may not remove a secret from Git history, caches, logs, or external systems.

## Decision lineage

- `adapts`: [ADR-0030](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0030-separate-public-contracts-from-private-provenance.long.md).

## Official sources

- [NIST Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)
- [GitHub Actions guidance for secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
