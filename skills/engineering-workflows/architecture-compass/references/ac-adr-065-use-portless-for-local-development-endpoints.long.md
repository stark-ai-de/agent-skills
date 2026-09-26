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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-25
Gist: Default compatible local development endpoints to Portless and HTTPS, migrate existing routing through authorized changes, and document evidence-backed exceptions.

Variants: [Short](ac-adr-065-use-portless-for-local-development-endpoints.short.md) · **Long, canonical** · [Guide](ac-adr-065-use-portless-for-local-development-endpoints.guide.md)

## Context

Port-number URLs can identify different apps across restarts, conflict between
services or worktrees, and make browser automation depend on guessed endpoints.
Named local endpoints improve developer and agent navigation. Introducing a
proxy also affects start commands, TLS, auth origins and host provisioning;
those boundaries require qualification rather than blanket installation.

## Decision

### Default suitable local development to Portless

A target repository adopting this decision MUST use Portless as its default
local development URL and launch path for compatible HTTP/WebSocket servers.
HTTPS MUST be the normal target. The rule applies to a single app as well as
monorepos and parallel worktrees, regardless of implementation language.

Evaluate actual endpoints, launch commands, runtime, networking and trust
requirements. A repository without relevant local endpoints is not applicable;
do not add a runtime or package manifest merely to mark the decision adopted.
Non-HTTP protocols, production routing and CI topology are outside this default.
Remote and container workflows require evidence for their actual routing owner
and reachability; a reachable containerized HTTP endpoint is not excluded solely
because it is containerized.

### Prefer migration and make exceptions reviewable

Existing local routing, including a functionally equivalent solution, MUST be
treated as a migration candidate at the next suitable, authorized development
workflow change. Equivalence alone MUST NOT become a permanent exception. Do not
replace functioning routing during unrelated work or leave competing proxies
owning the same endpoint after migration.

Technical exceptions MUST identify the affected endpoint/environment, concrete
constraint or evidence gap, retained solution, owner and revisit trigger. A
temporary HTTP or direct-launch path MAY preserve development when HTTPS or
Portless cannot yet be qualified. Unverified prerequisites MUST be reported as
pending, not successful adoption. Recheck exceptions when their trigger occurs.

Accepted target-repository decisions remain authoritative. If migration conflicts
with one, name the conflict and stop dependent implementation until a local
adaptation or successor is accepted. This provider decision does not overwrite
local policy or authorize changes across other repositories.

### Preserve development and ownership contracts

Integrate Portless into the ordinary repository development entrypoint and
document the resolved URLs for developers, agents and browser tests. Retain an
explicit direct launch or bypass path for diagnosis and rollback. Required
origins, cookies, redirects and callbacks MUST remain correct after URL changes.

Every proxied server MUST listen on the assigned or explicitly configured port.
Names MUST identify the intended repository, service and concurrent worktree.
Detect and disambiguate collisions; generated names alone are not proof of
uniqueness. Do not take over another worktree's route or terminate its process
to make the current start succeed. Preserve task ordering and process ownership.

Retain the target's dependency, package-manager and runtime governance. Where
AC-ADR-058 applies, preserve Bun-first execution and its evidence-based fallback
contract. Upstream Node requirements do not alone establish Bun compatibility
or incompatibility. Keep runtime/version details and command adaptations in
maintained configuration and Guide rather than freezing them in this decision.

Separate repository integration from host provisioning. Installation, shared
proxy lifecycle, certificate trust, hosts-file changes and privileged operations
must respect existing environment ownership and authorization. Keep routing
local by default; LAN/public exposure is a separate explicit requirement.
Governance setup alone MUST NOT install tooling or refactor applications; audit
MUST remain read-only. Use the existing authorized workflow for migration.

### Qualify adoption with observable behavior

Before claiming a target migration is complete, prove that the normal start
command and resolved URL reach the intended service/worktree, including relevant
simultaneous launches, port use and restart behavior. Verify TLS trust in actual
supported browsers/clients and required HTTP, WebSocket, HMR and auth flows.
Exercise the direct fallback. Evidence is scoped to the tested environment and
version; library/static validation does not prove target runtime compatibility.

## Invariants

- Suitable local web development uses Portless and HTTPS by default.
- Migration follows authorized scope and accepted local governance.
- Exceptions are bounded, evidenced, owned and revisitable.
- A URL resolves to its intended service/worktree without route takeover.
- Toolchain ownership, host trust and direct recovery remain explicit.

## Validation

Inspect applicability and local ADR mapping, then qualify the actual launch,
endpoint identity, concurrent services/worktrees, TLS clients and required
protocol/auth behaviors. Record exceptions and exercise rollback. Keep static
library, installation payload, agent behavior and target runtime evidence
separate; select checks under the owning validation policy.

## Consequences

Stable names make local navigation and browser automation more predictable.
Existing projects acquire deliberate migration and compatibility work. Proxy
or trust failures can interrupt development; a direct launch path and scoped
exceptions preserve recovery without hiding incomplete adoption.

## Alternatives

- Rejected: install Portless in every repository without checking endpoints or
  compatibility. This adds tools where no applicable development workflow exists.
- Rejected: treat existing equivalent routing as a permanent exemption. The
  accepted preference is convergence during suitable authorized changes.
- Rejected: migrate every repository immediately. Provider adoption does not
  grant authority over unrelated repositories, host configuration or deployment.
- Rejected: allow guessed ports or route takeover as collision recovery. Both
  undermine service identity and parallel-worktree isolation.
