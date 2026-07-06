# User Rules Manual Action

## Prompt

Use $cursor-memory-curator to review this exported Cursor User Rules text and tell me what should stay global.

## Expected Behavior

- Triggers `cursor-memory-curator`.
- Treats the supplied text as a User Rules export or settings evidence.
- Does not assume a local editable User Rules file.
- Classifies stable user-wide preferences as `MOVE TO CURSOR USER RULES` or `KEEP`.
- Classifies repo-specific commands as `MOVE TO AGENTS.md`, `MOVE TO REPO DOCS`, or `DELETE`.
- Provides manual Cursor settings actions for User Rules.
- Does not edit repo files unless a separate approved move is requested.

## Fixture

- Synthetic User Rules export text supplied in the prompt.
