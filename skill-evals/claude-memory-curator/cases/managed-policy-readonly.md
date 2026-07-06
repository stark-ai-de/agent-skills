# Managed Policy Readonly

## Prompt

Use $claude-memory-curator to review this managed Claude policy instruction and tell me whether it conflicts with the repo.

## Expected Behavior

- Triggers `claude-memory-curator`.
- Treats managed policy evidence as higher-precedence and read-only by default.
- Reads only the relevant synthetic repo files needed to verify the conflict.
- Classifies required organization-wide changes as `MOVE TO MANAGED POLICY` manual action or `ASK USER`.
- Does not edit `/etc/claude-code/CLAUDE.md`, managed settings, or drop-in policy fragments.

## Fixture

- Synthetic managed policy export plus a repo `CLAUDE.md`.
