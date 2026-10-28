# ADR-0071: Add target-specific OpenAI distribution profiles

ID: ADR-0071
Title: Add target-specific OpenAI distribution profiles
Status: Superseded
Date: 2026-10-16
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: distribution, openai, profiles, mcp
Applies when: Changing OpenAI distribution identity, transport or release artifacts.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0070
Superseded by: ADR-0076
Guide verified: 2026-10-16
Gist: One canonical source selects an explicit OpenAI distribution profile for each immutable release.

Variants: [Short](0071-add-target-specific-openai-distribution-profiles.short.md) · **Long, canonical** · [Guide](0071-add-target-specific-openai-distribution-profiles.guide.md)

## Decision

Eine kanonische Quelle definiert explizite OpenAI-Distributionsprofile mit jeweils eigener Identität, Version und MCP-Zuordnung. Jeder Release wählt genau ein Profil. Generierung, gemeinsame Identitätsableitung und öffentliche Nachweise verwenden dieses Profil. Portable und Claude behalten den unabhängig gepflegten, revisions- und digest-gepinnten SSH-Runtime-Import einschließlich vollständiger Payload-Prüfung und Offline-Projektion. Kanonische Skill-Inhalte, temporäre native Adapter und getrennte Zielvalidierung bleiben erhalten. OpenAI kann abhängig von bestätigter Zulassung Skills-only, Remote-MCP oder lokalen stdio-MCP ausgeben.

## Why

Die neue Zulassungslage erfordert unterschiedliche OpenAI-Verträge, ohne SSH-Ownership oder reproduzierbare Distribution aufzugeben.

## Options

- Chosen: gemeinsame kanonische Quelle und explizite Zielverträge. Die neue Zulassungslage erfordert unterschiedliche OpenAI-Verträge, ohne SSH-Ownership oder reproduzierbare Distribution aufzugeben.
- Rejected: Generierte Pakete manuell verändern oder eine gemeinsame Identität ungeprüft für unterschiedliche Portalprodukte verwenden.

## Consequences

- Good: explizite Zuständigkeiten und reproduzierbare Zielpakete
- Tradeoff: Profilabhängige Generator-, Identitäts- und Releaseprüfungen werden erforderlich.
- Risk: Externe Zulassung und Review bleiben eigenständige Nachweise.

## Follow-up

The maintainer explicitly approved this specification and its architecture decisions on 2026-10-16 and requested pull requests for implementation and qualification. Acceptance is separate from implementation, deployment and publication evidence.
