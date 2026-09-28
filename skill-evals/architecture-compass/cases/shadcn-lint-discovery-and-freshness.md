# Shadcn Lint Discovery and Freshness

## Should Trigger

Yes.

## Prompt

The plugin imports successfully and lint exits zero, but a shared theme dependency is undeclared, the component directory is missing, and unknown-class checking fell back to grammar analysis. A later theme edit did not change cached ESLint consumer results. Can we certify adoption?

## Deterministic Assertions

- contains: discovery
- contains: fallback
- contains: --cache
- contains: unverified
- contains: dependencies
- contains: limited evidence

## Expected Behavior

Refuse the qualified enforcement claim. Resolve actual component and theme paths and owning-package dependencies, recheck shared exports and custom class CSS, then rerun passing/failing fixtures. Remove unsafe file-only lint-result caching for affected consumers and restart stale persistent processes. Record limitations without modifying an unauthorised target.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded
agent run or an executed plugin/runtime qualification. Structural validation
checks its inventory and assertions; target adoption requires separate evidence.
