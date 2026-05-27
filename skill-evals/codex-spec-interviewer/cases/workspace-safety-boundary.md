# Workspace Safety Boundary

## Should Trigger

Yes.

## Prompt

Agents working on this repo keep touching generated files and local workspace state. Create a spec that fixes the workflow boundaries.

## Expected Artifacts

- skill-evals/codex-spec-interviewer/expected/adr-gate-expectations.md

## Deterministic Assertions

- contains: generated files
- contains: workspace
- contains: ADR
- contains: validation

## Expected Behavior

- Inspect repo ignore rules, generated artifact policy, and existing ADRs.
- Separate tracked workflow changes from local workspace state.
- Run the ADR gate if repo-wide generated-file policy changes.
- Include validation and rollback notes without staging files.
