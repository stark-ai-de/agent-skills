<!-- karakeep-knowledge:start -->

## Shared agent knowledge

Use the globally installed `karakeep-knowledge` skill when saved references or an
existing document-sync policy are relevant. For a connection or sync readiness
question in a Git repository, invoke its read-only check:
`node ~/.agents/skills/karakeep-knowledge/scripts/knowledge.mjs check --repo <absolute-repository-root>`.
Resolve the skill's actual installed path if the host uses another location. Reuse
this check within the same repository/context; check again after a repository or
policy change. Respect the host's normal permissions for local-service access.
If the host blocks the shell check, keep sync readiness unverified and test the
already configured MCP read connection independently; report each result separately.

`connection: ready` means collection reads are available. `sync: not_enabled` is an
ordinary read-only mode; it does not call for repository adoption. If configuration
is missing, offer setup only when needed for the requested workflow. Reading saved
references through the configured MCP connection needs no project sync grant.
Follow an adopted project policy without repeating approval for its routine writes.
At meaningful completion or handoff under that policy, reconcile eligible documents, separate drafts,
factual session reports and approved aggregates within that policy. Preserve source
content and repository authority; propose new independent findings/dossiers first.
Continue repository work if Karakeep is unavailable and report pending knowledge
work. No background service, blanket import or extra pilot project is required.
<!-- karakeep-knowledge:end -->
