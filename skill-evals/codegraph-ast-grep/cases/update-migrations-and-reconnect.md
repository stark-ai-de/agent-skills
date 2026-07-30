# Update Migrations and Reconnect

## Should Trigger

Yes.

## Prompt

The pinned CodeGraph version is outdated. Upgrade it through the existing project package manager and complete all compatibility work.

## Expected Behavior

- Select `update`, retain the exact project-local installer provenance, and avoid substituting a global or different package channel.
- Inspect installed and target release requirements, then run required config/index/schema migrations within the announced root.
- Reconnect the client and verify the winning executable, exposed MCP tools, graph freshness, semantic query, structural query, and target guidance.
- Preserve generated state on failure and report a pre-disclosed same-channel rollback or its limitation.
