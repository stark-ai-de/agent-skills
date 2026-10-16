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
Guide verified: 2026-10-16
Gist: Default compatible local development endpoints to Portless and HTTPS, migrate existing routing through authorized changes, and document evidence-backed exceptions.

Variants: [Short](ac-adr-066-use-portless-for-local-development-endpoints.short.md) · [Long, canonical](ac-adr-066-use-portless-for-local-development-endpoints.long.md) · **Guide**

## Purpose

This Guide is non-normative. Long owns the decision; this file records current
integration mechanics and evidence to collect. Documentation/source review on
2026-10-16 for v0.15.8 is not a universal runtime or browser qualification.

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

## Forward between services without a proxy loop

When a frontend forwards `/api` back through Portless to an API, preserve the
target service's Host header. Forwarding the frontend Host instead routes the
request back to the frontend; the hop guard eventually returns `508 Loop Detected`.

For example, this JavaScript Vite configuration discovers the API address from
the same managed CLI environment. Set `DEV_API_NAME` to the complete, already
disambiguated API name emitted by the checkout's launcher; `--no-worktree` avoids
adding another prefix. `get` formats an address even for an unregistered name,
so verify the corresponding route and API identity before starting the frontend.

```js
import { execFileSync } from "node:child_process";

const apiName = process.env.DEV_API_NAME;
if (!apiName) throw new Error("DEV_API_NAME must identify this checkout's API");
const apiUrl = execFileSync("portless", ["get", apiName, "--no-worktree"], {
  encoding: "utf8",
}).trim();

export default {
  server: {
    proxy: {
      "/api": {
        target: apiUrl,
        changeOrigin: true,
        ws: true,
      },
    },
  },
};
```

Keep `ws: true` when that route requires WebSocket forwarding and qualify the
actual HMR/public WSS origin separately. The Node process performing HTTPS
forwarding must trust the selected proxy CA from process startup, using its
qualified CA configuration. Do not disable upstream certificate verification,
set `secure: false`, or downgrade HTTPS to fix a Host-routing loop. Exercise both
an API identity response and a WebSocket message through the frontend; a direct
API request alone does not prove the two-service path.

Source: [pinned HTTP and WebSocket loop handling](https://github.com/vercel-labs/portless/blob/v0.15.8/packages/portless/src/proxy.ts).

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

### Managed-host configuration and first diagnostics

The following client environment describes the loopback profile above. Obtain the
state path from the host's approved configuration; the service and every client
must select the same directory. Values are configuration inputs, not commands to
repair a host during repository startup.

| Input                                                     | Managed loopback profile                                |
| --------------------------------------------------------- | ------------------------------------------------------- |
| `PORTLESS_STATE_DIR`                                      | Explicit absolute path owned by the selected host/user  |
| `PORTLESS_PORT`                                           | `443`, or the host's explicitly qualified listener port |
| `PORTLESS_HTTPS`                                          | `1`                                                     |
| `PORTLESS_TLD`                                            | `localhost`                                             |
| `PORTLESS_SYNC_HOSTS`                                     | `0`                                                     |
| `PORTLESS_LAN`, `PORTLESS_WILDCARD`                       | `0`                                                     |
| `PORTLESS_TAILSCALE`, `PORTLESS_FUNNEL`, `PORTLESS_NGROK` | `0`                                                     |

Start diagnosis with read-only commands under that same environment:

```sh
portless doctor
portless list
# When the service is owned by the upstream service installer:
portless service status
```

For a declarative NixOS service, inspect the selected unit's status and effective
configuration instead; an upstream service-status result does not establish that
unit's ownership. Verify daemon identity, liveness, actual state/listeners,
HTTPS/TLD/LAN settings and persisted markers before delegation. Ordinary app
commands auto-start a missing proxy and reuse persisted settings. An explicit
client environment alone does not make mismatched running settings fail: the
reviewed CLI can warn and continue. A managed adapter therefore stops on missing
or mismatched prerequisites, leaving host repair to its owner. It must not hide
`proxy start`, `service install`, `trust`, `hosts sync`, `clean` or global `prune`
inside normal repository startup. A successful `doctor` remains diagnostic
evidence, not proof of trust in every supported client.

Ordinary v0.15.8 app startup also attempts cleanup of orphaned process groups
recorded in the shared route registry. Distinct names and avoiding `--force` do
not disable that behavior or establish per-checkout cleanup authority. Inspect
that lifecycle under the actual registry owner; use a qualified adapter or retain
an owned exception when foreign-process isolation cannot be established. Do not
run global cleanup to make an unrelated checkout start successfully.

Sources: [pinned CLI startup and diagnostics](https://github.com/vercel-labs/portless/blob/v0.15.8/packages/portless/src/cli.ts),
[state discovery](https://github.com/vercel-labs/portless/blob/v0.15.8/packages/portless/src/cli-utils.ts).

### Scope, initialize and verify the CA

Assign CA and state ownership to an explicit host/user trust boundary. Repositories
on that development host can share its owned proxy; cloning a repository onto
another developer's machine does not transfer CA ownership. For a multi-host Nix
configuration, select the public CA and expected fingerprint through host-specific
inputs. Keep only the public CA in those inputs and declare it through
`security.pki.certificateFiles`; never require every developer to possess the
private key corresponding to one repository-wide development CA.

Keep CA private keys in protected local state and a protected backup outside the
repository and Nix store. Independent developer hosts/users initialize their own
CA/key pair. A client that must access the same proxy, such as the Windows browser
for a WSL proxy, needs only that proxy's verified public CA. Do not copy a CA
private key to another developer or checkout to satisfy a fingerprint check.

Distinguish initial provisioning from recovery of an already provisioned host:

1. For first installation, obtain the host owner's authorization for CA creation
   and the required trust-store changes. Use a separately invoked, version-qualified
   bootstrap under the designated owner to generate the initial CA/key pair in
   protected state; a repository start command must not hide this bootstrap.
2. Declare the resulting public CA and expected fingerprint for that host. Install
   trust only in the intended clients. Before the first proxy start, verify the
   fingerprint, validity, private-key ownership/permissions, public-key match and
   Linux trust chain.
3. Start the owned proxy for real HTTPS client verification, then mark the host
   provisioned and enable normal managed startup only when that verification
   succeeds. Keep the same CA preflight on every subsequent start. For an already
   provisioned host, a missing or different CA requires restoration or an explicit
   rotation; fail before Portless can silently generate a replacement.

Missing authority or unverified trust leaves provisioning pending. Do not turn
first installation into an automatic recovery exception or disable TLS checks.

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
suffixes or detached worktrees. For a repository-owned ES module launcher inside
a Git checkout, with Git available, one reproducible explicit-name strategy is:

```js
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const launcherDirectory = dirname(fileURLToPath(import.meta.url));
const gitEnvironment = { ...process.env };
const repositoryVariables = execFileSync("git", ["rev-parse", "--local-env-vars"], {
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/);
for (const variable of repositoryVariables) delete gitEnvironment[variable];
const checkout = realpathSync(
  execFileSync("git", ["-C", launcherDirectory, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    env: gitEnvironment,
  }).trim(),
);
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

Git's `-C` alone does not override inherited repository selectors. Remove the
Git-local names returned by `rev-parse --local-env-vars`, including `GIT_DIR`,
`GIT_WORK_TREE` and `GIT_COMMON_DIR`, from the lookup child's environment.
Preserve unrelated runtime and authentication variables and the launcher's own
environment. Enumeration or lookup failure stops the launch. See
[Git's hook isolation pattern](https://git-scm.com/docs/githooks#_description).

The Git lookup is anchored to the launcher's file, so invoking that launcher
from the root, a package subdirectory or another working directory preserves
the same checkout identity. A separate linked checkout still gets its own root.
A failed root lookup stops the launch; do not fall back to the terminal's current
directory. For a non-Git project, use an explicit verified root from the owned
launcher or repository configuration. Document that moving a checkout changes
its identity. Use the explicit-name form
`portless <name> <command>` for an already disambiguated name, and obtain its
resolved address with `portless get <name> --no-worktree`. Do not add a second
automatic worktree prefix. Short hashes reduce collisions; route-conflict
handling and an application identity check still establish the actual owner.

The launch adapter must wire the assigned or explicitly configured port to the
actual listener; a conflicting explicit port fails instead of silently ignoring
it. A directly launched backend consumes injected `PORT`. For a container with a
fixed internal port, the owned adapter can map assigned `PORT` to a host-side
published port and register that reachable port with the proxy. Verify both sides
of the mapping. Use `PORTLESS_URL` for public origin checks, HMR/WebSocket
configuration and displayed links, and make an occupied backend/published port
fail.

Choose binding by network namespace. When proxy and backend share the host
network namespace, bind the backend to loopback. For a Docker bridge backend
reached by a host proxy, the server instead listens on the container interface
(often `0.0.0.0` inside the container), while publication binds only to host
loopback, such as `-p 127.0.0.1:<host-port>:<container-port>`. Container loopback
alone is not reachable through that mapping. Recheck IPv4/IPv6 publication and
the selected Docker networking mode; do not publish on all host interfaces to
make the proxy reachable. See [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/).

### Already-running containers and static aliases

An attached launcher owns its container command and assigned-port mapping. For
an independently managed, already-running container, leave lifecycle with its
existing owner. Verify readiness, service/checkout identity, the internal listener
and host-loopback-only published port before registering that reachable port:

```sh
# Only after ownership, readiness and route-conflict checks:
portless alias "$DEV_ALIAS_NAME" "$DEV_PUBLISHED_PORT"
portless get "$DEV_ALIAS_NAME" --no-worktree
# Only while the exact alias mapping is still owned by this lifecycle:
portless alias --remove "$DEV_ALIAS_NAME"
```

Use a complete disambiguated name and a verified numeric published port. Static
aliases have no container process ownership token. In v0.15.8, registering an
existing static alias can replace its mapping even without `--force`. Inspect
the current route and retain an ownership record before registration; reject
foreign or changed mappings instead of treating CLI success as proof of safety.
Serialize registration/removal through the routing owner where concurrent
writers are possible: a separate check followed by a CLI call is not atomic.
If exclusive ownership cannot be established, leave the change pending. Before
removal, recheck the exact name, port and ownership; remove only that alias.
Do not stop the independent container, clean shared state or terminate another
project's process. Confirm that the backend, another route and shared proxy remain
healthy after scoped removal. A Node port fixture proves routing/lifecycle only;
actual Docker networking still needs representative Docker evidence.

Sources: [pinned alias CLI](https://github.com/vercel-labs/portless/blob/v0.15.8/packages/portless/src/cli.ts),
[route replacement semantics](https://github.com/vercel-labs/portless/blob/v0.15.8/packages/portless/src/routes.ts).

For a remote proxy or another network namespace, identify the routing owner,
restricted connection and browser-visible hostname before applying this example.
A local name does not establish cross-host reachability. Keep an unqualified
topology pending or retain its documented fallback; do not silently enable LAN
mode or public tunnels.

An identity response can include the canonical checkout path, service and
process identity; keep it local and reject cross-origin access to that metadata.

Before reuse, verify the reached service and checkout, not just HTTP 200.
A live name conflict fails without `--force`, killing a foreign process or
replacing its route. Before cleaning a stale entry, compare process identity,
start time where available, and listener ownership; save the old registry.
Retest two distinct checkouts simultaneously, restart one, and confirm that
stopping it leaves the other checkout and shared proxy reachable.

## Qualify authentication before adopting checkout domains

Inventory required login callbacks, registered redirect URIs, allowed origins
and cookie scopes before replacing a working URL with generated checkout names.
A fixed redirect registration may not accept a new checkout hostname. Confirm
the actual provider's domain and exact-match rules; see
[OAuth 2.0 Security BCP, section 2.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1).

Choose a provider-supported strategy within the authorized scope: explicitly
registered checkout URLs or an existing approved callback endpoint that preserves
checkout identity and validates its return destination. If the provider requires
an owned development domain, qualify that domain and its trust/routing separately;
the loopback `.localhost` profile above is not a universal OAuth configuration.
Repository integration alone does not authorize provider registrations, DNS,
hosts-file edits or new public exposure. Do not replace exact registrations with
wildcard or overly broad redirect/origin allowlists, introduce open redirects or
disable TLS validation just to pass the migration.

Record expected session isolation or intentional sharing and verify it across
two checkouts, including cookie domain/path, required login/logout and return to
the correct checkout. If the required callback strategy cannot be qualified,
retain the documented route or direct fallback as a scoped technical exception
with evidence, an owner and a revisit trigger. Mark authentication adoption
pending rather than inferring it from a successful HTTPS page load. A repository
without a real auth flow records that check as not applicable.

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
