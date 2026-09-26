# Parallel Worktree Route Collision

## Should Trigger

Yes.

## Prompt

Two active worktrees, feature/auth and fix/auth, resolve to the same Portless name. Another checkout has detached HEAD. Plan reliable concurrent browser testing without disrupting any other agent.

## Deterministic Assertions

- contains: AC-ADR-065
- contains: collision
- contains: identity
- contains: direct

## Expected Behavior

Check resolved route identity rather than assuming generated prefixes are unique. Use worktree-aware launch forms, disambiguate names and verify simultaneous service/worktree responses, port wiring and required HMR/WebSocket behavior. Do not force route takeover or kill another worktree process. Verify HTTPS clients and the direct recovery path; record only actually observed runtime evidence.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
