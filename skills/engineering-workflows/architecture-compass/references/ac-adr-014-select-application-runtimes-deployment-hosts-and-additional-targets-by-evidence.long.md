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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Select every runtime and host against the deployable's real compatibility, operations, security, and delivery requirements.

Variants: [Short](ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence.short.md) · **Long, canonical** · [Guide](ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence.guide.md)

## Context

Framework, runtime, package manager, and deployment host are related but distinct choices. A runtime that works for a direct worker may not be the supported runtime of a hosted framework function. A web application can sometimes be packaged for mobile or desktop, but native permissions, update channels, and threat models change the architecture.

## Decision

### Evaluate each deployable independently

Before adopting or changing a runtime or host, record a compatibility matrix containing:

- framework and adapter support, required runtime APIs, native modules, and package compatibility;
- request protocols, streaming, websockets, background work, maximum duration, concurrency, memory, filesystem, and state assumptions;
- build tooling, package manager and lockfile support, artifact reproducibility, and local parity;
- regions, data residency, networking, identity, secret delivery, observability, incident access, and compliance;
- scale behavior, cold starts, quotas, vendor-specific limits, expected traffic, and cost;
- deployment, rollback, preview, migration, support ownership, and exit path.

The selected combination must be supported by its authoritative documentation or proven with a maintained compatibility test. A successful development server is insufficient. Unsupported combinations are recorded as experiments, not defaults.

### Keep choices conditional

Next.js is suitable for React web applications that benefit from its routing, rendering, server/client composition, caching, and deployment ecosystem. Its supported runtime for a given route or host remains the authority. A separately deployed service or worker may select Node.js, Bun, or another runtime after dependency and operations checks.

Elysia or another HTTP framework is selected for its contract model and runtime/adapter fit, not merely because a runtime was selected. A framework adapter, host integration, or serverless entrypoint is validated separately from a long-running listener.

Vercel is selected when its current Next.js integration, regions, function and background-work model, observability, security, compliance, cost, and team workflow fit the system. Provider-specific services remain behind explicit application boundaries when portability or failure independence matters. Other hosts are evaluated with the same matrix.

### Treat mobile and desktop as separate products

Capacitor is eligible when the product is predominantly web UI and required device capabilities have supportable plugins or narrow native extensions. The decision includes platform navigation, offline/storage, deep links, permissions, signing, store review, updates, crash reporting, and device test coverage.

Electron is eligible when desktop OS integration, distribution, or Windows-focused requirements outweigh its process, update, footprint, and security costs. Renderer content is treated as untrusted: isolation, sandboxing, narrow preload APIs, validated IPC, navigation/window controls, content security policy, dependency hygiene, signing, and secure updates are required. Node integration is not exposed to arbitrary renderer content.

Web, mobile, and desktop targets may share domain and UI code only across runtime-safe public boundaries. Target-specific storage, permissions, update behavior, and telemetry remain owned by target adapters.

### Separate evidence stages

Compatibility evidence identifies the exact runtime, framework, adapter, package manager, lockfile, host or device, build command, and artifact revision. Local, CI, hosted preview, production, app-store, and physical-device results are reported separately. Missing hosted or device access remains an explicit evidence gap.

## Consequences

The repository avoids fashionable universal defaults and makes host constraints visible before code depends on them. Selection takes more up-front investigation, but deployment surprises and hard-to-exit coupling decrease.

## Validation

- Build and run the production artifact with the selected package manager, runtime, and adapter.
- Exercise streaming, protocols, filesystem/state assumptions, timeouts, shutdown, and native dependencies that matter to the deployable.
- Test deployment and rollback on the actual host; verify secrets, regions, logs, metrics, and quotas.
- For mobile/desktop, test supported OS/device versions, permissions, offline/reconnect, deep links, signing, update, and rollback.
- Threat-model any host bridge, preload API, plugin, IPC channel, or provider credential boundary.
