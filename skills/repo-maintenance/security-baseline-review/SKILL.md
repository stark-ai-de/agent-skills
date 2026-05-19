---
name: security-baseline-review
description: Review public repository security hygiene at a baseline maintainer level. Use when the user asks for secret-leak checks, SECURITY.md review, dependency hygiene, GitHub settings checklist, CI safety, or public release security readiness.
license: MIT
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# Security Baseline Review

## Goal

Review a public repository for baseline security hygiene without exploiting systems, exposing sensitive data, or overclaiming vulnerability status.

## When to use

- The user asks for a public repo security readiness check.
- Secret hygiene, CI permissions, dependency policy, or `SECURITY.md` needs review.
- A repository is about to be published.

## When not to use

- The user asks for exploit development or offensive instructions.
- A full code vulnerability audit is required beyond maintainer hygiene.
- Current CVE status is required but live advisory data is unavailable.

## Inputs to inspect

- `.gitignore`, `.env.example`, config samples, workflows, `SECURITY.md`, README, and contribution docs.
- Dependency manifests, lockfiles, and update automation config.
- Repository settings checklist when live GitHub access is authorized.

## Review rubric

Check obvious secret patterns, sensitive examples, CI permissions, untrusted pull request behavior, dependency update policy, security reporting path, branch protection notes, and public/private boundary clarity. Read `references/security-checklist.md` for detail.

## Workflow

1. Inspect public-facing files and config examples.
2. Search for obvious secret-like patterns without printing sensitive values.
3. Review workflow permissions and risky shell patterns.
4. Check dependency and security policy coverage.
5. Recommend safer defaults and rotation if exposure is suspected.
6. Separate confirmed issues from items requiring live repository settings.

## Safety rules

- Do not print suspected secret values.
- Do not provide exploit instructions or proof-of-concept attack steps.
- Recommend rotation before history cleanup when exposure is plausible.

## References

Read only when needed:

- `references/security-checklist.md`

## Scripts

No bundled scripts.

## Output format

Return:

1. Baseline verdict
2. Critical findings
3. High-priority findings
4. Medium or policy findings
5. Settings to verify live
6. Recommended next action

## Failure modes

- If a possible secret is found, do not quote it; identify the file and remediation.
- If live settings cannot be checked, label them unverified.
- If dependency advisories are needed, use current sources or say they were not checked.

## Completion criteria

- No sensitive value is disclosed in the report.
- Findings are actionable and prioritized.
- Public release blockers are clearly separated from hardening suggestions.
