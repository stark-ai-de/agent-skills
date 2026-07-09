# Data Schema

`prepare-skillopt-split.mjs` converts `skill-evals/<skill>/cases/*.md` into split JSON under `.agents/skillopt-work/<skill>/data/`.

Each item has this shape:

```json
{
  "id": "codex-spec-interviewer/fuzzy-refactor-request",
  "skill_name": "codex-spec-interviewer",
  "case_path": "skill-evals/codex-spec-interviewer/cases/fuzzy-refactor-request.md",
  "prompt": "We need to clean up the billing integration...",
  "expected_behavior": ["Ask targeted clarification only where repo inspection cannot answer."],
  "rubric_path": "skill-evals/codex-spec-interviewer/rubric.md",
  "fixtures": [],
  "expected_artifacts": [],
  "deterministic_assertions": ["contains: implementation spec"],
  "visual_assertions": [],
  "tags": ["positive"],
  "should_trigger": true,
  "workspace_policy": "workspace-write",
  "source_hash": "sha256:..."
}
```

## Parsing Rules

- Extract `prompt` from `## Prompt`.
- Extract expected behavior bullets from `## Expected Behavior`.
- Extract fixture paths from `## Fixture` or `## Fixtures`.
- Extract expected artifact paths from `## Expected Artifact` or `## Expected Artifacts`; otherwise link shared files under `skill-evals/<skill>/expected/` when present.
- Extract deterministic checks from `## Deterministic Assertions`.
- Extract generated-artifact checks from `## Visual Assertions`.
- Preserve `Should Trigger Yes/No` when present.
- Link `rubric.md` and `expected/` artifacts when present.
- Exclude raw run transcripts from generated JSON.
- Put activation-only negative cases in `.agents/skillopt-work/<skill>/activation/negative-cases.json`.

Default split policy starts from 60 percent train, 20 percent validation, 20 percent test, seed 42. When enough cases exist, the splitter preserves the documented held-out floors: at least 3 validation and 3 test cases for exploratory-quality data, and at least 5 validation and 5 test cases for official-parity-candidate data.

Supported deterministic assertion prefixes are:

- `contains: <text>`
- `not_contains: <text>`
- `regex: <pattern>`
- `section: <heading>`
- `path: <repo-relative path>`

When deterministic assertions are present, the local evaluator checks them before semantic LLM judging. A failed deterministic assertion fails the item without relying on the LLM judge.

Supported visual assertion prefixes are:

- `artifact_exists: <glob>`
- `png_dimensions: <glob> min_width=<px> min_height=<px>`
- `png_nonblank: <glob> [min_size=<bytes>]`
- `svg_valid: <glob>`
- `svg_contains: <glob> <text>`
- `svg_not_contains: <glob> <text>`

Visual assertions are evaluated against artifacts captured from the rollout workspace. They are intended for image-generating eval environments where draw.io Desktop export is available; if required artifacts are missing, the item fails deterministically.
