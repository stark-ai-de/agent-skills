# Frontmatter Examples

## Good

```yaml
---
name: pr-review
description: Review pull requests for correctness, maintainability, tests, security, docs impact, release risk, and agent-induced failure modes. Use when the user asks for a PR review, diff review, merge readiness check, or maintainer feedback.
---
```

Why it works:

- Names the object: pull requests.
- Includes trigger phrases: PR review, diff review, merge readiness.
- Sets scope: correctness, tests, docs, security, release risk.

## Too Vague

```yaml
description: Helps with repositories.
```

Rewrite by naming the workflow, object, trigger phrases, and exclusions.

## Too Broad

```yaml
description: Maintain all engineering work, review code, deploy apps, debug incidents, write docs, and manage releases.
```

Split into focused skills. A routeable skill should have one primary workflow.
