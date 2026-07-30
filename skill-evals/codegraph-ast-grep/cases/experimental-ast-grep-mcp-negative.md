# Experimental ast-grep MCP Is Not Normal Setup

## Should Trigger

Yes.

## Prompt

Set up the normal supported CodeGraph and ast-grep stack for this repository.

## Expected Behavior

- Select `setup` and install/reconcile stable CodeGraph plus ast-grep CLI.
- Do not install or persist the experimental ast-grep MCP server, an unpinned Git source, or a normal-workflow dependency on it.
- Treat any explicit future MCP experiment as a separately reviewed scope expansion.
