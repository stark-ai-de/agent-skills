# Local Gateway Ownership and Extraction

## Should Trigger

Yes.

## Prompt

I run `skillopt-setup` from Cursor and Claude Code as well as Codex. Should the bundled Codex OpenAI-compatible gateway move into a shared routing skill, and should we add matching Cursor and Claude gateway scripts?

## Expected Behavior

- Activate `skillopt-setup`.
- Keep the loopback-only Codex gateway inside `skillopt-setup` because SkillOpt is its only demonstrated workflow consumer.
- Explain that Cursor or Claude Code as the execution host does not change the `codex exec` backend and does not justify a gateway variant.
- Reject Claude- or Cursor-backed copies without a concrete SkillOpt backend contract and equivalent isolation proof.
- Require a second independent consumer plus fail-closed filesystem, process, tool, network, and inherited-environment isolation before extracting a reusable gateway.
- Require `/v1/chat/completions` preflight before use.
- Keep remote publication, workloads, NetworkPolicy, and secrets in the infrastructure source of truth and require an external OS/container boundary.

## Deterministic Assertions

- contains: skillopt-setup
- contains: execution host
- contains: second independent consumer
- contains: fail-closed isolation
- contains: filesystem, process, tool, network, and inherited-environment isolation
- contains: /v1/chat/completions
- contains: infrastructure source of truth
- contains: loopback-only
- contains: OS/container boundary

## Visual Assertions

- None.
