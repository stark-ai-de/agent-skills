# Clear Initial Setup

## Should Trigger

Yes.

## Prompt

Set up Hetzner Inference for Codex and Claude Code on this Linux host. Diagnose first, use live model discovery, show me the plan, and do not apply until I approve it.

## Deterministic assertions

- selects setup
- runs offline diagnosis before any network action
- asks for or records explicit provider discovery approval
- selects only a model present in fresh `/v1/models` evidence
- creates a persisted plan and stops before apply
- describes provider token and administrative gateway key separately
- does not claim either client verified

## Expected behavior

Proceed through safe offline inspection and an explicitly approved bounded discovery. Present the exact plan ID, operations, approvals, paths, versions, and evidence limits, then wait for apply approval.
