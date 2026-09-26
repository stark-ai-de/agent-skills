# Artifact destinations

Use when selecting delivery and concrete spec/ADR paths. Reuse the request, prior answers and exact write authority; do not restart permission discovery at finalization.

## Discover delivery and paths

1. Default to a repository-owned saved spec; explicit chat-only delivery takes precedence without a persistence question. Carry existing save authority forward and identify the path while interviewing.
2. Use an explicit path first, then a clear repository convention. If neither exists, propose `docs/specs/<kebab-slug>-spec.md`.
3. Inspect public/private placement, directory existence and existing destination content. Raise material ambiguity early or include it in the final checkpoint. Do not interrupt merely to confirm a clear existing convention.
4. Include unapproved directory creation, overwrites, required ADR writes and minimal ADR index updates in the same concrete checkpoint. Previously approved actions do not need another question unless their scope or target state changed.

In this `agent-skills` repository, follow `docs/specs.md`: use the ignored `docs/specs/do-not-publish/` for private, exploratory, sensitive, repository-creation, or not-yet-public specs. Use public `docs/specs/` only after the maintainer explicitly confirms publishability. In other repositories, local conventions take precedence. An intentionally local-only artifact does not require a new sharing question; ask only when an ignored destination conflicts with the requested shared result. Never unignore a path implicitly.

Use lowercase kebab-case names ending in `-spec.md` unless the repository requires another format. Do not add sequential numbers unless the repository does.

## Approve and persist

Follow [workflow-details.md](workflow-details.md): prepare the complete reviewable content, then combine content approval and outstanding concrete write decisions into one positive checkpoint. A mode toggle alone is not approval. Do not overwrite a file merely because the slug matches; inspect its content and reuse only authority that covers that content/state.

Native Plan permits no repository persistence. Keep an approved result pending until actual exit and known write permissions, without asking approval again. During save-only finalization write only the spec, required ADR and minimal convention-required ADR index entry; capture other documentation work in the spec for later implementation. Read back saved artifacts and report actual paths. Explicit chat-only output completes the requested delivery; a blocked requested save remains incomplete.

## ADR destinations and status

Follow the repository's ADR directory, linked representations, template, numbering and index. Keep one durable decision per ADR. Default to `Proposed` unless the maintainer explicitly accepts the reviewed decision. Approval to save a proposed ADR is not decision acceptance. Carry prior acceptance forward when unchanged. Link required ADRs from the spec and block dependent implementation until acceptance.
