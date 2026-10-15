# AC-ADR-066: Use Portless for Local Development Endpoints

ID: AC-ADR-066
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
Guide verified: 2026-10-15
Gist: Default compatible local development endpoints to Portless and HTTPS, migrate existing routing through authorized changes, and document evidence-backed exceptions.

Variants: [Short](ac-adr-066-use-portless-for-local-development-endpoints.short.md) · [Long, canonical](ac-adr-066-use-portless-for-local-development-endpoints.long.md) · **Guide**

## Purpose

This Guide is non-normative. Long owns the decision; this file records current
integration mechanics and evidence to collect. Documentation/source review on
2026-10-15 for v0.15.8 is not a universal runtime or browser qualification.

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

## Operate one shared proxy on NixOS and WSL

For a host-managed installation, pin the package version and verified source
hash in Nix. Execute the proxy and its runtime from the Nix store; a root service
must not execute a writable global package-manager shim. Keep the application's
package-manager pin independent from the global tooling version. Turn a former
bootstrap helper into a read-only installation/ownership check after migration.

Choose one proxy owner and one explicit state directory for both daemon and CLI.
The v0.15.8 CLI requires root for a listener below 1024 even with a bind
capability. Its upstream foreground service supports
`proxy start --foreground --https --port 443 --tld localhost --skip-trust`.
Treat `--skip-trust` as a pinned-version service integration detail: it skips
trust installation, not certificate or hostname verification. Recheck it when
upgrading. Use the version's ownership mechanism for files the privileged
process creates in the user's state directory.

Keep the HTTPS listeners and optional HTTP redirect on IPv4/IPv6 loopback.
Set the same port, HTTPS mode, TLD and state directory in service and client
environments. Leave LAN mode, extra TLDs, tunnels and automatic hosts-file
synchronization disabled. Inspect persisted settings as well as environment
variables; an earlier custom TLD must not silently survive the migration.
Repository launchers neither start a competing shared proxy nor stop it.

### Preserve and verify the CA

Keep only the public CA in the configuration repository and declare it through
`security.pki.certificateFiles`. Keep CA private keys in protected local state
and a protected backup outside the repository and Nix store. Before starting
the service, check the public CA's SHA-256 DER fingerprint against the declared
certificate, validity, private-key ownership/permissions, public-key match and
Linux trust chain. A missing or different CA requires restoration or an explicit
rotation; fail before Portless can silently generate a replacement.

NixOS does not generally provide Debian's `update-ca-certificates`.
[Upstream issue 336](https://github.com/vercel-labs/portless/issues/336) describes
that first-run failure. An installer marker or a successful `portless doctor`
is not proof that the active NixOS CA bundle trusts the certificate. For example:

```sh
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt "$PORTLESS_STATE_DIR/ca.pem"
openssl x509 -in "$PORTLESS_STATE_DIR/ca.pem" -noout -dates -fingerprint -sha256
```

WSL Linux trust, Windows `CurrentUser\\Root`, the actual browser and Node
clients are separate checks. Match the Windows certificate by SHA-256 of its
DER bytes, not by display name; import only the verified public CA when trust is
actually missing. Test a normal HTTPS request without an exception afterward.

For a standalone Node client, provide the required CA at process startup, for
example `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt node probe.mjs`,
or qualify its supported system-CA option. Setting that environment variable
after Node has started does not update the current process's trust. Never use
`NODE_TLS_REJECT_UNAUTHORIZED=0` or disable browser certificate verification.

Windows curl with Schannel can report `CRYPT_E_NO_REVOCATION_CHECK` when a
local CA has no revocation-list distribution point. Check trust and hostname
matching separately; a normal Windows `Invoke-WebRequest` can distinguish this
client-specific condition from a missing CA. For an intentionally selected local
curl probe, [`--ssl-revoke-best-effort`](https://curl.se/docs/manpage.html#--ssl-revoke-best-effort)
tolerates missing/offline revocation information while retaining CA and hostname
checks. Keep that choice scoped to the diagnostic invocation; never substitute
`--insecure` or a global TLS-validation bypass.

A wildcard for `*.localhost` does not cover a multi-label name such as
`ui.checkout-a.example.localhost`. Verify the actual leaf certificate and SNI
handling for the chosen checkout name. After a deliberate CA rotation, update
the declared public CA and each client trust store, restart the owned service,
then recheck HTTP, HMR and HTTPS clients. Rollback normally retains the shared CA.

Sources reviewed for v0.15.8:
[service example](https://github.com/vercel-labs/portless/tree/v0.15.8/packages/portless),
[certificate implementation](https://github.com/vercel-labs/portless/blob/v0.15.8/packages/portless/src/certs.ts),
[NixOS certificate option](https://nixos.org/manual/nixos/stable/options.html#opt-security.pki.certificateFiles).

## Derive a checkout identity when branch names are insufficient

A branch suffix alone cannot distinguish separate clones, matching branch
suffixes or detached worktrees. One reproducible explicit-name strategy is:

```js
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { basename } from "node:path";

const checkout = realpathSync(process.cwd()); // verified repository root
const label =
  basename(checkout)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)
    .replace(/-$/g, "") || "checkout";
const id = createHash("sha256").update(checkout).digest("hex").slice(0, 10);
const name = `ui.${label}-${id}.example-app`;
```

Resolve the root from the repository-owned launcher's location or verified Git
top-level, not an arbitrary terminal working directory. Document that moving a
checkout changes its identity. Use the explicit-name form
`portless <name> <command>` for an already disambiguated name, and obtain its
resolved address with `portless get <name> --no-worktree`. Do not add a second
automatic worktree prefix. Short hashes reduce collisions; route-conflict
handling and an application identity check still establish the actual owner.

The backend must consume injected `PORT`; a conflicting explicit port fails
instead of silently ignoring it. Use `PORTLESS_URL` for public origin checks,
HMR/WebSocket configuration and displayed links. Bind the backend to loopback
and make an occupied backend port fail. An identity response can include the
canonical checkout path, service and process identity; keep it local and reject
cross-origin access to that metadata.

Before reuse, verify the reached service and checkout, not just HTTP 200.
A live name conflict fails without `--force`, killing a foreign process or
replacing its route. Before cleaning a stale entry, compare process identity,
start time where available, and listener ownership; save the old registry.
Retest two distinct checkouts simultaneously, restart one, and confirm that
stopping it leaves the other checkout and shared proxy reachable.

## Diagnose the failing boundary

| Observation                               | Next check                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Backend fails inside WSL                  | Start command, assigned port, application log and checkout identity    |
| Backend works; proxy URL fails inside WSL | Shared state, route ownership, proxy journal, SNI and Linux CA trust   |
| WSL HTTPS works; Windows fails            | Windows loopback reachability, name resolution and Windows CA trust    |
| Windows works; integrated browser fails   | Actual browser/profile trust and browser-visible URL                   |
| Page works; HMR fails                     | Public WSS origin, client port, WebSocket upgrade and backend listener |
| Browser works; Node fails                 | CA options at process startup and the exact Node runtime               |

A proxy hostname is not proof of Windows-to-WSL connectivity. If forwarding
fails, compare the direct backend and proxy listener from both operating systems
before changing firewall or trust settings. For rollback, restore only the
owned launch/configuration changes and verify the direct fallback; preserve
other applications, shared proxy state and certificates.

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
