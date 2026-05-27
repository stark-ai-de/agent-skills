# Summarize Run Without Transcripts

## Should Trigger

Yes.

## Prompt

Create a public summary for `.agents/skillopt-work/codex-spec-interviewer/outputs/run-001` so we can commit evidence under `skill-evals/codex-spec-interviewer/runs/`.

## Expected Behavior

- Activate `skillopt-setup`.
- Use `summarize-skillopt-run.mjs` and write only a compact Markdown summary after review.
- Include SkillOpt commit, target skill path, initial and best hashes, mode, run profile, official-parity status, optimizer backend, target backend, judge backend, split counts, model pins, expected artifact status, and validation status.
- Exclude raw trajectories, provider credentials, Codex auth tokens, private paths, and `.env` contents.
- Mark candidate acceptance as proposed, accepted, or rejected.
