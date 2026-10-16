# ADR-0072: Share one metadata validation core across MCP transports

ID: ADR-0072
Title: Share one metadata validation core across MCP transports
Status: Accepted
Date: 2026-10-16
Owner: stark-ai-de
Scope: repository
Category: backend
Tags: mcp, metadata, validation, vercel, privacy
Applies when: Implementing or deploying the metadata validation MCP.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-16
Gist: One stateless repository-owned core serves metadata validation through HTTP and stdio.

Variants: **Short** · [Long, canonical](0072-share-one-metadata-validation-core-across-mcp-transports.long.md) · [Guide](0072-share-one-metadata-validation-core-across-mcp-transports.guide.md)

## Decision

Das Repository besitzt einen zustandslosen Metadaten-Prüfkern in einem eigenen Workspace-Paket. HTTP auf Vercel und lokales stdio sind dünne Adapter desselben Kerns. Der Dienst verarbeitet ausschließlich ausdrücklich übergebene Metadaten nach gepinnten Regeln, führt keine externen Aktionen aus und speichert keine Eingabeinhalte. Remote-Zugriff benötigt für diese öffentlichen Berechnungen keine Benutzerkonten.

## Context

Ein gemeinsamer Kern erfüllt Remote- und Desktop-Anforderungen mit kleinem Betriebsaufwand.

## Consequences

- Good: explizite Zuständigkeiten und reproduzierbare Zielpakete
- Tradeoff: Hosting und veröffentlichte Datenschutzangaben erhalten einen konkreten Owner; beide Transportadapter benötigen gemeinsame Vertragstests.
- Risk: Externe Zulassung und Review bleiben eigenständige Nachweise.
