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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Select every runtime and host against the deployable's real compatibility, operations, security, and delivery requirements.

Variants: **Short** · [Long, canonical](ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence.long.md) · [Guide](ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence.guide.md)

## Decision summary

- Choose runtime and host per deployable from an explicit matrix covering framework support, dependencies, protocols, execution duration, state, scaling, regions, observability, security, compliance, cost, and operator experience.
- Use framework-native defaults when they satisfy the matrix. Do not make Bun, Node.js, Elysia, Vercel, or any other provider a universal repository default.
- Prove package-manager, build, runtime, and host compatibility with the actual lockfile and production artifact before adoption.
- Keep applications portable at owned boundaries: configuration, storage, queueing, identity, files, and model providers do not leak arbitrary host APIs through domain code.
- Select Capacitor only when a web-first product can meet mobile requirements through a native container and plugins. Select Electron only when desktop capabilities justify its larger security and operational boundary.
- Additional targets define update, signing, permissions, storage, offline, telemetry, rollback, and support responsibilities before release.
- Record evidence gaps as unresolved; local success does not prove hosted or device behavior.
