# No Spec Structure Repo

## Should Trigger

Yes.

## Prompt

Write an implementation spec for adding rate limiting to our public API. This repo has no docs folder or spec convention yet.

## Expected Behavior

- Activate `codex-spec-interviewer` and run the interview normally.
- Detect that no spec or ADR structure exists during the repo pass without interrupting the interview.
- At the final checkpoint, suggest the smallest conventional structure such as `docs/specs/` and `docs/adrs/`.
- Ask for confirmation before creating any new directory; do not create folders silently.
- If the user does not approve a destination, stop before creating final artifacts and return the save-ready spec with the proposed path.
