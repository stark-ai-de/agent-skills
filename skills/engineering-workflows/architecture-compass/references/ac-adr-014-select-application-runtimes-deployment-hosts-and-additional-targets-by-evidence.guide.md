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
Guide verified: 2026-07-28
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

### Suggested evidence record

Capture exact framework/runtime/adapter/package-manager versions, platform and architecture, build command, lockfile hash or revision, exercised capabilities, host deployment ID, and unresolved gaps. Repeat the matrix after a major runtime, framework, host, or plugin update.

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
