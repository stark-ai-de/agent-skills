# Release Process Change

## Should Trigger

Yes.

## Prompt

Change the release workflow so publishing only happens after a manual approval. Spec it before editing workflows.

## Expected Artifacts

- skill-evals/codex-spec-interviewer/expected/adr-gate-expectations.md

## Deterministic Assertions

- contains: release
- contains: workflow
- contains: manual approval
- contains: ADR

## Expected Behavior

- Inspect existing release docs, workflow files, and ADRs.
- Treat repo-wide publishing policy as ADR-sensitive.
- Include validation commands and a rollback path.
- Do not edit workflow files during spec creation.
