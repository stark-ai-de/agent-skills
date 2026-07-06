# Team Rule Conflict Readonly

## Prompt

Use $cursor-memory-curator to review this exported Team Rule. It seems to conflict with this repo's ADR.

## Expected Behavior

- Triggers `cursor-memory-curator`.
- Treats the Team Rule as shared policy evidence, not as a repo file to edit.
- Reads only the relevant synthetic ADR or repo docs needed to verify the conflict.
- Cites the higher-precedence or more specific source and explains the conflict.
- Classifies the Team Rule action as `MOVE TO CURSOR TEAM RULES`, `KEEP BUT REWRITE`, or `ASK USER`.
- Recommends a manual team-rule review instead of directly editing Team Rules.

## Fixture

- Synthetic Team Rule export plus a conflicting repo ADR.
