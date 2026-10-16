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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-16
Gist: One stateless repository-owned core serves metadata validation through HTTP and stdio.

Variants: [Short](0072-share-one-metadata-validation-core-across-mcp-transports.short.md) · **Long, canonical** · [Guide](0072-share-one-metadata-validation-core-across-mcp-transports.guide.md)

## Decision

Das Repository besitzt einen zustandslosen Metadaten-Prüfkern in einem eigenen Workspace-Paket. HTTP auf Vercel und lokales stdio sind dünne Adapter desselben Kerns. Der Dienst verarbeitet ausschließlich ausdrücklich übergebene Metadaten nach gepinnten Regeln, führt keine externen Aktionen aus und speichert keine Eingabeinhalte. Remote-Zugriff benötigt für diese öffentlichen Berechnungen keine Benutzerkonten.

## Why

Ein gemeinsamer Kern erfüllt Remote- und Desktop-Anforderungen mit kleinem Betriebsaufwand.

## Options

- Chosen: gemeinsame kanonische Quelle und explizite Zielverträge. Ein gemeinsamer Kern erfüllt Remote- und Desktop-Anforderungen mit kleinem Betriebsaufwand.
- Rejected: Getrennte Validatorimplementierungen, öffentlich gehostetes SSH und ein funktionsloser MCP.

## Consequences

- Good: explizite Zuständigkeiten und reproduzierbare Zielpakete
- Tradeoff: Hosting und veröffentlichte Datenschutzangaben erhalten einen konkreten Owner; beide Transportadapter benötigen gemeinsame Vertragstests.
- Risk: Externe Zulassung und Review bleiben eigenständige Nachweise.

## Follow-up

The maintainer explicitly approved this specification and its architecture decisions on 2026-10-16 and requested pull requests for implementation and qualification. Acceptance is separate from implementation, deployment and publication evidence.
