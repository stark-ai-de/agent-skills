# ADR-0058: Require qualified Jev host advice after repository adoption

ID: ADR-0058
Title: Require qualified Jev host advice after repository adoption
Status: Accepted
Date: 2026-09-25
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: architecture-compass, jev, host-advice, adoption, qualification
Applies when: Publishing or adopting a repository policy for qualified Jev advice through explicitly enabled agent hosts.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-26
Gist: Require qualified Jev advice after explicit repository adoption while retaining separate host activation, processing authorization and native fallback.

Variants: [Short](0058-require-qualified-jev-host-advice-after-repository-adoption.short.md) · [Long, canonical](0058-require-qualified-jev-host-advice-after-repository-adoption.long.md) · **Guide**

This guide is non-normative. [Long](0058-require-qualified-jev-host-advice-after-repository-adoption.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Verify this accepted record and its decision lock. Maintainer acceptance on 2026-09-25 authorizes the specified implementation; it does not establish hook availability, global activation or qualification.
2. Before feature implementation, record an immutable hook dependency commit and review its actual registration-builder interface. Preserve concurrent work and accepted history.
3. Use the target-repository, adoptable AC-ADR-065 and its synchronized catalog, lineage, setup matrix, validators and evaluations. The originally planned AC-ADR-059 was occupied.
4. During target setup, record adopt, adapt, defer or reject with the target's own governance identity. An adopted rule states the required capability and its scope; it does not write global host configuration or grant provider consent.
5. Use the render command from the installed Jev skill to obtain a configuration fragment. The implemented source provides this command; an older installed release may require a separately authorized update:

   ```sh
   python3 scripts/jev_hooks.py render --host codex --policy repository-adopted
   ```

6. Review and apply the fragment through the host owner's configuration management and normal hook-trust flow. Disclose and obtain the processing authorization for the actual scope. Do not bypass managed restrictions or duplicate a configured registration.
7. Verify hook delivery, current eligible capabilities, the agent's consultation and the first substantive action separately. A pure reminder must not process prompt text, read credentials or contact TypeSafe.
8. During audit, report installation, configuration, trust/activation, processing authority and qualification evidence separately. Unknown or stale evidence is not a pass. Preserve native operation and name the unmet obligation rather than silently repairing configuration.

## Verification

For governance acceptance, run `pnpm run validate:adrs`, a formatter check over the changed documents, relative-link checks and diff/scope inspection. Accepted ADR-0058 must match its decision lock; ADR-0057 must remain unchanged.

For later implementation, follow the [specification](../specs/jev-host-governance-spec.md). Cover renderer purity, ordinary native CLI prompts in two repository contexts, material changes, unchanged follow-ups, absent adoption or processing authority, capability restrictions, uncertain inventory, failures and removal of the policy fragment. Inspect outgoing synthetic test payloads and run the separately bounded real TypeSafe smoke.

No native CLI or provider run was performed to persist or accept this decision. The Guide verified date describes document review, not host qualification. Controlled transport fixtures, real provider observations and publication/install evidence remain separate.

Subsequent implementation observations are maintained in the [Jev evaluation record](../../skill-evals/jev-capability-advisor/README.md#repository-policy-qualification). Its bounded native smoke and fallback results do not qualify general automatic repository advice; the remaining acceptance gaps stay explicit.

## Current references

- [ADR-0057](0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) retains optional activation, host qualification, native fallback and execution ownership.
- [ADR-0039](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.long.md) governs promotion of reusable behavior into the public Architecture Compass contract.
- [ADR-0043](0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) governs canonical skill ownership and generated projections.
- [Codex hooks](https://learn.chatgpt.com/docs/hooks#userpromptsubmit) describe fixed additional context and hook trust. Documentation is not installed-host proof.
- [Codex app-server skills](https://learn.chatgpt.com/docs/app-server#skills) describe discovery; discovery alone does not establish every effective invocation restriction.

## Revisit

Create a successor if advice becomes a universal prerequisite, provider failure blocks ordinary work, adoption starts authorizing host changes, inventory requirements are relaxed, or execution ownership moves from the host. Update the reciprocal supersession metadata in all variants when an accepted decision changes.
