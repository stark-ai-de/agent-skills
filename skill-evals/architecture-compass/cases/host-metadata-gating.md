# Host Metadata Gating

## Should Trigger

Yes.

## Prompt

Use Architecture Compass `audit` to review three conforming public skills: one
intentionally Codex/OpenAI-facing, one Claude-only, and one host-neutral
portable workflow. Report where `agents/openai.yaml` belongs, but do not change
any file or install anything. Native read-only enforcement is active.

## Deterministic Assertions

- contains: Selected workflow: audit
- contains: report-only
- contains: Read-only enforcement: enforced
- contains: Execution status: not requested
- contains: SKILL.md
- contains: agents/openai.yaml
- contains: Codex/OpenAI-facing
- contains: additive
- contains: host-neutral
- not_contains: require agents/openai.yaml for every skill
- not_contains: Added agents/openai.yaml
- not_contains: Updated agents/openai.yaml

## Expected Behavior

- Select `audit` and keep the case report-only with no tracked, untracked,
  generated, index, install, or external mutation.
- Report `SKILL.md` as the conforming package and activation contract for all
  three skills.
- Recommend `agents/openai.yaml` only for the intentionally Codex/OpenAI surface
  and name a separately authorized follow-up if it is missing or incoherent.
- Do not recommend OpenAI metadata for Claude-only or host-neutral skills merely
  for symmetry.
- Do not let host metadata broaden permissions, select a workflow silently, or
  contradict portable identity and description.
