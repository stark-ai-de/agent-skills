# Source Challenge

Use this reference before finalizing a spec. The goal is to catch stale, inherited, or weak decisions without turning every spec into a full research project.

## Challenge Targets

Challenge only decisions that materially affect correctness, safety, maintainability, user behavior, or implementation strategy:

- named requirements from the user or an existing spec,
- ADR-backed assumptions,
- framework, package, API, or platform behavior,
- security, auth, billing, data migration, or shared-contract decisions,
- unusual architecture or best-practice claims,
- implementation approaches that conflict with repo conventions.

Do not re-litigate settled choices when they are still valid and low-risk.

## Source Order

Prefer sources in this order:

1. Current user answers.
2. Repo instructions such as `AGENTS.md`, `CLAUDE.md`, `CLAUDE.local.md`, `.claude/CLAUDE.md`, `.claude/rules/**/*.md`, `~/.claude/rules/**/*.md`, and `docs/agents/`.
3. Domain language such as `CONTEXT.md`.
4. ADRs, existing specs, and plans.
5. Current source code, tests, package scripts, and CI.
6. Official docs through MCP tools when available.
7. Official web docs or primary sources when MCP tools are unavailable.
8. Secondary sources only for broad context, never as the sole basis for a risky requirement.

Treat Claude Code auto memory as a local evidence source only when the user surfaces it, `/memory` exposes it, or the requested plan depends on durable Claude context. Do not make private local memory paths part of a public spec unless the user explicitly asks.

## MCP and Web Lookup

Use MCP documentation tools or web search when:

- the spec depends on current framework, package, SDK, API, or cloud behavior,
- an existing requirement may be obsolete,
- a best-practice claim is central to the implementation,
- standards, security guidance, or compatibility constraints may have changed.

Skip external lookup when:

- repo-local source code is the actual contract,
- the decision is purely product preference,
- the change is tiny and unaffected by current external guidance,
- the user explicitly says not to browse or query external sources.

## Challenge Report

Include a short source challenge section in the final output:

```md
## Source challenge

- Repo evidence checked:
- ADRs/specs checked:
- External docs checked:
- Requirements revised:
- Requirements preserved:
- Preceding ADR/spec work needed:
- ADR gate result:
- Skipped checks and why:
```

Use concise findings. If all checks support the existing plan, say that directly.

## Preceding Decisions

If the challenge shows that a prerequisite decision is missing or stale:

1. Do not silently encode the disputed assumption into the implementation spec.
2. Propose a preceding ADR, spec revision, or explicit maintainer decision.
3. Mark implementation as blocked or phased until that decision is resolved.
4. Keep the final spec honest about what is decided and what is not.
