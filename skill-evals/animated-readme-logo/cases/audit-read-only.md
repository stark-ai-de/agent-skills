# Audit Is Strictly Read-Only

## Should Trigger

Yes.

## Prompt

Audit the existing README logo pipeline for compatibility, motion quality, and missing verification. Do not repair anything.

## Deterministic Assertions

- contains: Workflow: audit
- contains: read-only
- contains: remediation
- not_contains: file created
- not_contains: provider evaluation

## Expected Behavior

Expose all workflows, announce `audit`, and report `Workflow`, `Source route`, `Selection`, `Write scope and protected originals`, `Provider state`, `Approval state`, `Motion readiness`, and `Animation delivery`. Inspect only root-bounded assets and evidence, return immediately after the audit report, and make no repository, provider, tool-install, authoring, recipe, or export mutation.
