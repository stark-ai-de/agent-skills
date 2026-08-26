# AC-ADR-014: Select Application Runtimes, Deployment Hosts, and Additional Targets by Evidence

ID: AC-ADR-014
Title: Select Application Runtimes, Deployment Hosts, and Additional Targets by Evidence
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: runtime-platform
Tags: runtime, deployment, hosting, nextjs, nodejs, bun, elysia, capacitor, electron
Applies when: Choosing or changing Next.js, Bun or Node.js, an HTTP framework, deployment hosting, mobile delivery, or desktop delivery.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Select every runtime and host against the deployable's real compatibility, operations, security, and delivery requirements.

Variants: [Short](ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence.short.md) · [Long, canonical](ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence.long.md) · **Guide**

## Implementation guide

This guide is non-normative. Re-check host and framework support immediately before adoption.

### Web and service targets

For a Next.js deployable, begin with the runtime supported by the framework and target host rather than forcing the runtime chosen for standalone workers. On Vercel, validate the current Node.js runtime, function limits, streaming path, regions, filesystem behavior, package-manager/lockfile support, and build output with a real preview deployment.

Bun can be a strong direct runtime for a separately deployed service or worker when required Node APIs, native dependencies, framework adapters, telemetry, and shutdown behavior pass production-artifact smoke tests. Elysia supports more than one delivery shape; choose its Bun server, Node adapter, Next.js integration, or host adapter only after validating that specific combination.

Do not infer pnpm-version support from a local install. If a host's published package-manager support matrix does not list the adopted version, treat it as unverified until an immutable preview artifact and repeatable build prove it.

### Mobile and desktop targets

For Capacitor, inventory every required native capability and plugin ownership before committing to a web wrapper. Run device/emulator tests for lifecycle suspension, offline storage, links, permissions, push notifications, signing, and updates.

For Electron, start from security defaults: context isolation and sandboxing enabled, Node integration disabled for remote/untrusted content, a narrow `contextBridge` preload API, sender and payload validation on IPC, restrictive navigation/window creation, CSP, no arbitrary remote code, signed artifacts, and a verified update channel. Keep privileged logic in the main process.

### Stack-deviation comparison

Before changing a framework, runtime, adapter, target, or host, record:

| Existing or accepted option | Required capability | Evidence-backed gap           | Candidate     | Chosen option            | Docs/ADR impact              | Validation        |
| --------------------------- | ------------------- | ----------------------------- | ------------- | ------------------------ | ---------------------------- | ----------------- |
| `<current runtime/host>`    | `<needed behavior>` | `<gap or "not insufficient">` | `<candidate>` | `<current or candidate>` | `<none, docs, or local ADR>` | `<focused proof>` |

Prefer the existing target combination and built-in capability when they satisfy the requirement. If the evidence-backed gap is `not insufficient`, reject the extra runtime, adapter, or host and continue only with the authorized bounded change. If the chosen option creates a durable deviation from an accepted target rule, stop the affected implementation and use the target repository's ADR change or successor process; AC-ADR-046 ranks the evidence but grants no write authority.

### Coordination with Bun-first tooling

[AC-ADR-055](ac-adr-055-use-pnpm-for-package-management-and-bun-for-execution.short.md) supplies a Bun-first candidate and package-ownership contract for JavaScript/TypeScript repository tooling. A representative AC-ADR-055 command, fixture, build, or runtime observation may populate this ADR's compatibility matrix, but the existence or adoption of AC-ADR-055 alone is not compatibility proof.

Apply the matrix to the concrete executable or deployable. Bun remains the winner only when it preserves correctness, operations, security, upstream support, and required delivery behavior. If another candidate has better qualifying evidence, select that candidate. When Bun cannot run the boundary and Node.js works with no better evidenced alternative, Node.js is the default fallback. Unknown or non-material cells may remain visible without blocking an otherwise mandatory-command-verified selection; the target repository decides whether its matrix is advisory or a gate.

### Suggested evidence record

Capture exact framework/runtime/adapter/package-manager versions, platform and architecture, build command, lockfile hash or revision, exercised capabilities, host deployment ID, and unresolved gaps. Repeat the matrix after a major runtime, framework, host, or plugin update.

When the selectable public-skill repository profile in AC-ADR-040 applies, treat its Node.js choice as repository-tooling ownership, not an application-runtime or deployment-host decision. Add Bun, Next.js, Elysia, an orchestrator, a documentation site, or a host only from the deployable evidence required by this ADR.

## Decision lineage

- `adapts`: [ADR-0034](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.long.md).

## Official sources

- [Next.js: Edge and Node.js runtimes](https://nextjs.org/docs/pages/api-reference/edge)
- [Vercel: Runtimes](https://vercel.com/docs/functions/runtimes)
- [Vercel: Package managers](https://vercel.com/docs/package-managers)
- [Bun documentation](https://bun.sh/docs)
- [Elysia: Node.js integration](https://elysiajs.com/integrations/node)
- [Elysia: Next.js integration](https://elysiajs.com/integrations/nextjs)
- [Capacitor documentation](https://capacitorjs.com/docs)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
