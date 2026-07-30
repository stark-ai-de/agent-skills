# AC-ADR-024: Meet an Explicit Accessibility Baseline With Automated and Manual Proof

ID: AC-ADR-024
Title: Meet an Explicit Accessibility Baseline With Automated and Manual Proof
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: frontend
Tags: accessibility, wcag, testing, inclusive-design
Applies when: Building or changing user-facing content, navigation, forms, media, status, or interaction.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Start from WCAG 2.2 AA and prove critical interactions with both automation and representative manual use.

Variants: [Short](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.short.md) · [Long, canonical](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Implement accessibility with the flow

1. Identify the users, critical journeys, content types, interaction modes, supported browsers and devices, and any requirements stricter than the starter baseline.
2. Design the document outline, landmarks, reading order, names, descriptions, error copy, status messaging, keyboard behavior, and focus transitions before selecting custom widgets.
3. Start with native elements. When a custom pattern is necessary, use the matching WAI-ARIA Authoring Practices pattern as guidance and test the actual implementation rather than assuming the pattern grants conformance.
4. Add component or integration checks for accessible names, relationships, states, keyboard behavior, and important rule violations.
5. Add automated scans to critical browser journeys, including error, loading, modal, menu, and completion states.
6. Run and record the manual scenarios below on the actual built experience.

## Minimum manual scenarios for changed critical journeys

- Complete the journey with keyboard only; inspect order, visibility, traps, skip behavior, overlays, and restoration.
- Navigate and complete it with a representative screen reader and browser combination selected by the repository.
- Zoom text and page content and test narrow reflow without losing information, order, or controls.
- Enable reduced motion and verify that non-essential animation is removed or reduced without hiding status.
- Inspect contrast, non-color cues, target operation, labels, instructions, errors, announcements, time limits, and media alternatives relevant to the flow.
- Repeat the path under validation failure, network delay or failure, empty data, and successful completion.

Automation can quickly identify missing names, invalid relationships, contrast failures detectable from rendered styles, and other rule-based defects. It cannot judge whether alternative text is meaningful, focus behavior supports the task, instructions are understandable, or a complete journey works with assistive technology.

## Evidence record

Record the exact revision or artifact, environment, route and journey, viewport, input method, browser, assistive technology and version when applicable, automated tool and ruleset, result, defect links, and unverified later stages. Treat a local scan as local evidence only.

## Official sources

- [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- [How to Meet WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [W3C evaluating web accessibility overview](https://www.w3.org/WAI/test-evaluate/)
- [W3C tools and techniques for accessibility evaluation](https://www.w3.org/WAI/test-evaluate/tools/)
