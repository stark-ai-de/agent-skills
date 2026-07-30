# Skill Authoring Style

## Frontmatter

Every `SKILL.md` must start with YAML frontmatter and follow https://agentskills.io/specification.

Required:

- `name`
- `description`

Recommended for promoted and incubator skills in this repo:

- `license: Apache-2.0`
- `metadata.author: stark-ai-de`
- `metadata.category: <category>`
- `metadata.version` as the skill's own `x.y.z` semver; new promoted and incubator skills may start at `"0.1.0"`

Increase a promoted skill's `metadata.version` when its public instructions, references, scripts, or behavior change. Leave unchanged promoted skills at their current version even when `package.json` is bumped for a repository release.

Descriptions are routing rules. Include the concrete workflow, trigger terms, and exclusions when important. Keep descriptions under 500 characters when possible and never over 1024 characters.

## OpenAI/Codex Metadata

Codex/OpenAI-facing skills under `skills/` and `incubator/skills/` should include `agents/openai.yaml`. Keep it focused on product metadata: `interface`, `policy.allow_implicit_invocation`, and `dependencies.tools`.

Keep `interface.default_prompt` executable by Codex: use current-host wording and do not name Claude Code- or Cursor-specific planning/question controls. Put target-specific evidence and output terms in the prompt, and keep host-specific lifecycle detail in `SKILL.md`.

Do not add `agents/openai.yaml` as boilerplate to every skill. Keep routing and workflow instructions in `SKILL.md`, and do not add product metadata to ignored project-local helper installs under `.agents/skills/` by default.

See [ADR-0016](adrs/0016-use-openai-metadata-for-codex-skills.short.md) ([Long, canonical](adrs/0016-use-openai-metadata-for-codex-skills.long.md) · [Guide](adrs/0016-use-openai-metadata-for-codex-skills.guide.md)) for the policy decision.

## Execution Host and Target Runtime

- Treat the execution host as the client running the skill and the target runtime as the agent whose evidence or artifacts the user wants to manage.
- Keep a workflow portable when its evidence and output contracts match. Create a target-specific skill only when its name, configuration, evidence, or output makes both its trigger and outcome materially distinct.
- When a target-specific skill runs from another host, preserve its target contract and adapt only planning, questions, permissions, and handoff to available host controls.
- Use descriptions for implicit discovery and explicit invocation, where supported, when deterministic selection matters. Do not add a catch-all router or custom metadata that claims to guarantee activation.
- Create an independent skill when it has a distinct trigger and outcome; do not impose a catalog-size quota.
- Keep a backend gateway with its owning skill until both a second independent consumer exists and a separately proven backend provides fail-closed filesystem, process, tool, network, and environment isolation.

See [ADR-0021](adrs/0021-place-portable-skills-in-workflow-categories.short.md) ([Long, canonical](adrs/0021-place-portable-skills-in-workflow-categories.long.md) · [Guide](adrs/0021-place-portable-skills-in-workflow-categories.guide.md)) and [ADR-0028](adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.short.md) ([Long, canonical](adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.long.md) · [Guide](adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.guide.md)).

## Finite Workflow Selection

A stable public skill with two or more materially different outcomes, artifact classes, or mutation scopes must expose one complete finite workflow set. Do not add a recursive `auto` workflow. Keep capability detection, deterministic fallback, execution-host translation, and effort sizing internal unless they independently change the user-visible outcome or authority boundary.

For a direct invocation with clear task intent and sufficient existing authority, show the complete workflow set, announce the selected workflow and rationale, state write scope and expected artifacts, then proceed. Agent-initiated activation may do the same within the user's already-authorized task; without mutation authority it may select only a relevant read-only route. A bare activation, conflicting cues, or material ambiguity about outcome, scope, persistence, governance, or mutation authority must expose the workflows and ask.

Workflow selection grants no new authority. Destructive, paid, irreversible, externally visible, deployment, publication, production, and scope-expanding actions retain their own approval boundaries. Single-outcome skills do not need an artificial selector.

Keep intent, ambiguity, and authority evals beside each affected skill and validate them through its focused contract. Do not maintain a central skill migration/disposition manifest.

See [ADR-0038](adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.short.md) ([Long, canonical](adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md) · [Guide](adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.guide.md)).

## Body Shape

Every skill should include:

- Goal
- When to use
- When not to use
- Inputs to inspect
- Workflow or process
- Safety rules
- Output format
- Completion criteria
- Failure modes when relevant

## References

Use references for long rubrics, examples, templates, decision trees, and troubleshooting guides. Reference files should be one level below the skill folder and linked directly from `SKILL.md`.

## Promotion Boundary

Use `skills/` only for promoted public skills. Put draft or candidate public skills under `incubator/skills/` with `metadata.internal: true` until their quality, activation fit, useful scope, and maintenance ROI justify promotion.

Keep eval prompts, rubrics, run summaries, and promotion proof under `skill-evals/` by default. Do not add eval material to the runtime skill payload unless the skill needs those fixtures while executing.

## Scripts

Scripts should be deterministic helpers. Prefer read-only scripts. If a script writes files, the owning skill must clearly say what it writes and that user approval is required before running it.

Shell scripts must use:

```bash
set -euo pipefail
```

## Tone

Write instructions for another agent. Be direct, operational, and concise. Do not explain basic software engineering concepts unless they are specific to the workflow.
