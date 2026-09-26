# AC-ADR-065: Use Portless for Local Development Endpoints

ID: AC-ADR-065
Title: Use Portless for Local Development Endpoints
Status: Accepted
Date: 2026-09-25
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: portless, local-development, https, endpoints, worktrees, migration
Applies when: Establishing, reviewing or changing local HTTP or WebSocket development endpoints, including single apps, monorepos and parallel worktrees.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-25
Gist: Default compatible local development endpoints to Portless and HTTPS, migrate existing routing through authorized changes, and document evidence-backed exceptions.

Variants: [Short](ac-adr-065-use-portless-for-local-development-endpoints.short.md) · [Long, canonical](ac-adr-065-use-portless-for-local-development-endpoints.long.md) · **Guide**

## Purpose

This Guide is non-normative. Long owns the decision; this file records current
integration mechanics and evidence to collect. Documentation/source review on
2026-09-25 is not a Portless runtime or browser qualification.

## Route and classify

Use the catalog's local-development concern route. Apply normal setup mapping
and distinguish compatible endpoints, not-applicable repositories, technical
exceptions and unresolved prerequisites. In recommended setup, local HTTP/WS
development is selection evidence even for one app. Complete setup evaluates
the decision alongside other adoptable entries. Audit reports without writing;
refactoring requires accepted local governance and authorized migration scope.

Read AC-ADR-013 for tooling ownership, AC-ADR-014 for runtime/hosting boundaries,
AC-ADR-019 for trust, AC-ADR-023 for process lifecycle, AC-ADR-054 for worktrees,
and AC-ADR-058 where JavaScript tooling execution applies. An existing accepted
proxy choice needs a local successor/adaptation before replacement. A working
equivalent proxy still receives a migration trigger instead of indefinite
exemption solely because it already works.

## Prepare the environment

Inspect the installed version and its supported execution environment before
changing repository commands. The reviewed upstream package declares Node 24+
and documents global or project-local installation. Use the environment's
existing owner; do not copy global npm installation into pnpm- or Nix-owned
configuration. Do not use transient download commands as a hidden bootstrap.
Apply the target's Bun-first qualification rule to the actual Portless command;
record a narrow fallback only with representative evidence or an authoritative
incompatibility. The application's own runtime is a separate boundary.

Current defaults include HTTPS and local certificate trust setup. WSL trust can
also affect the Windows user certificate store. Check permission and ownership
before invoking first-run bootstrap. Generic Linux support does not prove
NixOS trust provisioning: inspect the selected version and use the environment's
declarative certificates or another verified supported configuration. Record an
exception when this cannot yet be established. Host-file synchronization, shared
daemon configuration and privileged listeners are also host-owned concerns.

Sources: [installation](https://portless.sh/),
[HTTPS](https://portless.sh/https),
[package requirements](https://github.com/vercel-labs/portless/blob/main/packages/portless/package.json),
[certificate implementation](https://github.com/vercel-labs/portless/blob/main/packages/portless/src/certs.ts).
Recheck these moving references against the version selected by the target.

## Integrate the launch path

Keep the familiar project command. For example, a qualified JS project can
retain `pnpm run dev` as its entrypoint and a separate `dev:app` for direct
startup. Put runtime selection inside script bodies according to AC-ADR-058.
Avoid wrapping a script that recursively invokes itself through Portless.

Portless can discover workspace applications and preserve existing Turbo task
ordering. Configure only required overrides and keep non-server watchers out
of proxy routing. It supplies `PORT` and handles recognized framework commands;
compound commands, environment prefixes and delegated scripts may need explicit
port wiring. Inspect the server's actual listener instead of assuming flags
reached it. `PORTLESS=0` and the direct script are documented bypass choices;
verify the selected recovery path works with the repository's configuration.

Source: [configuration and port assignment](https://portless.sh/configuration).

## Verify names, protocols and topology

Prefer the worktree-aware `portless run` form when wrapping an explicit command.
Its `--name` option keeps worktree-prefix handling, whereas the positional
explicit-name form does not. Obtain the resolved URL through the installed
CLI's discovery output, such as `portless get`, rather than constructing it
from assumed branch rules. Do not rely on port numbers disappearing in every
host setup: a configured proxy listener may use a non-default port.

Check two relevant worktrees together. Sanitization, branches with the same
final name component and detached worktrees can require disambiguation. Choose
distinct names and verify route ownership; do not use `--force` or kill another
worktree's server as routine collision handling.

Portless is an HTTP/WebSocket proxy, not generic TCP/UDP routing for database
protocols. A container's published HTTP port can qualify when reachable by the
proxy; container DNS, remote browsers and CI have separate network boundaries.
Keep those lanes unchanged unless their actual topology is included in the
authorized change. Leave LAN, tunnels and public exposure out of the default.

Sources: [commands](https://portless.sh/commands),
[name derivation](https://github.com/vercel-labs/portless/blob/main/packages/portless/src/auto.ts),
[proxy implementation](https://github.com/vercel-labs/portless/blob/main/packages/portless/src/proxy.ts).

## Collect migration evidence and recover

Record the selected version, environment, owned command, expected app/worktree,
resolved URL and outcome of representative requests. Verify simultaneous starts,
restart identity, HTTP responses and required WebSocket/HMR updates. Exercise
relevant login, cookies, CORS and callback URLs. Test certificate trust using
the actual browser and non-browser clients; one client's success is not proof
for every trust store.

For a blocked boundary, record its evidence or missing prerequisite, retained
configuration, responsible owner and concrete revisit event. Save pre-migration
URL/origin configuration and test the direct launch path before retiring old
routing. Roll back only owned repository changes and owned routes/processes;
do not remove shared certificates or stop other projects' proxy services.
