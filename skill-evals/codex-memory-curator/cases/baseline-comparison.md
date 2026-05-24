# Baseline Comparison

## Prompt

Compare how a normal Codex response and $codex-memory-curator handle stale repo-specific memories in the synthetic fixture.

## Expected Behavior

- Triggers `codex-memory-curator` because the prompt explicitly names the skill and stale repo-specific memories.
- Identifies that the with-skill output should be graded against a baseline response.
- With-skill output must include bounded inventory, redacted risk scan evidence, atomic classifications, confidence, and a structured cleanup plan only when the cleanup scope warrants ID-level approval.
- Baseline output may summarize stale memories, but should be marked weaker if it lacks approval gating, backup requirement, destination classification, or conflict-source citations.
- Does not claim measured superiority unless a real baseline run exists.

## Fixture

- `fixtures/synthetic-codex-home/memories/MEMORY.md`
- `fixtures/synthetic-repo/AGENTS.md`
- `fixtures/synthetic-repo/package.json`
