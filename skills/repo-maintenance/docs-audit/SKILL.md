---
name: docs-audit
description: Audit repository documentation, README, examples, installation steps, onboarding flow, API docs, and contribution docs. Use when the user asks whether docs are clear, complete, current, or ready for a public repo.
license: MIT
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# Docs Audit

## Goal

Find documentation gaps that block users, contributors, maintainers, or agents from understanding, installing, validating, and safely changing the repository.

## When to use

- The user asks whether docs are clear, complete, current, or public-ready.
- README, examples, onboarding, API docs, or contribution docs need review.
- Documentation promises may have drifted from actual code and commands.

## When not to use

- The user asks for a full repo maintenance audit; use `repo-health-audit`.
- The user wants release notes; use `release-manager`.
- The user wants prose editing only and no repo evidence check.

## Inputs to inspect

- README, docs, examples, changelog, contributing guide, security policy, and license.
- Package scripts, CLI help, config examples, and source files that docs mention.
- Internal links, install commands, screenshots, and generated docs.

## Review rubric

Check audience fit, first-run path, command accuracy, link integrity, examples, maintenance docs, public safety, and agent usability. Read `references/docs-rubric.md` for details.

## Workflow

1. Identify the intended audiences and main user journeys.
2. Compare README promises with actual files and commands.
3. Verify install, validate, and usage examples where practical.
4. Check internal links and stale references.
5. Separate user-facing docs gaps from maintainer-only improvements.
6. Produce a prioritized docs gap list.

## Safety rules

- Do not publish docs, rewrite policy, or change public support commitments without approval.
- Do not include private URLs, internal hostnames, customer details, or credentials in examples.
- Mark commands as unverified when they were not run.

## References

Read only when needed:

- `references/docs-rubric.md`

## Scripts

No bundled scripts.

## Output format

Return:

1. Summary
2. Blocking docs gaps
3. Confusing or stale sections
4. Missing examples
5. Suggested rewrite or new docs
6. Recommended next action

## Failure modes

- If commands cannot run, report them as unverified instead of broken.
- If the product goal is unclear, infer it from README and mark the inference.
- If docs are generated, identify the source file before editing output.

## Completion criteria

- Findings reference docs paths and, when relevant, source-of-truth code.
- Recommended changes are prioritized by user impact.
- The next docs action is specific.
