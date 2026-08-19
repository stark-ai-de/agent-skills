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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Start from WCAG 2.2 AA and prove critical interactions with both automation and representative manual use.

Variants: [Short](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.short.md) · **Long, canonical** · [Guide](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.guide.md)

## Context

A component library, semantic snapshot, or automated scanner can detect useful defects but cannot establish that a person can understand and complete a real journey with a keyboard, screen reader, zoom, reduced motion, or other assistive setup. Accessibility added after visual implementation tends to produce fragile ARIA patches and repeated refactors.

## Decision

User-facing interfaces start from WCAG 2.2 Level AA and integrate accessibility into structure, interaction, content, testing, and acceptance. A target repository may adopt stricter criteria or additional legal and product requirements, but it must record that scope explicitly.

### Structure and content

- Prefer native semantic elements and platform behavior before custom roles or scripted interaction. Use ARIA only to supply semantics that native HTML cannot express, and keep name, role, value, state, and relationships accurate.
- Provide a logical heading and landmark structure, meaningful link and control names, declared language, text alternatives for meaningful non-text content, and a way to bypass repeated navigation where applicable.
- Associate form controls with persistent labels and relevant instructions. Identify errors in text, connect them to affected fields, preserve entered data where safe, and provide a recoverable path.
- Do not use color, position, shape, sound, or motion as the only carrier of meaning. Content and controls remain usable at the required contrast, text zoom, viewport reflow, orientation, and spacing conditions.

### Interaction and state

- Every interactive function is operable by keyboard with a logical focus order and visible focus. Components do not trap focus except for a deliberate modal interaction with an accessible exit and correct focus restoration.
- Focus moves only when the user's task or a substantial context change requires it. Route transitions, dialogs, menus, validation, loading, and errors expose predictable focus and announcement behavior.
- Pointer targets and gestures provide usable alternatives according to the selected baseline. Time limits, session expiry, autoplay, flashing content, and motion include the required control, warning, extension, or reduction behavior.
- Dynamic status, progress, validation, and completion are available without stealing focus. Loading and retry states remain understandable and operable under slow or failed requests.
- Media supplies applicable captions, transcripts, audio description, controls, and non-autoplay behavior according to its content and the selected conformance scope.

### Proof

- Add automated semantic and accessibility checks at the owning component, integration, and critical browser journey layers where they are deterministic.
- Manually exercise critical journeys using keyboard only, visible focus, zoom and reflow, reduced motion where applicable, and representative screen-reader/browser combinations chosen by the target repository.
- Review content, alternatives, error recovery, timing, cognitive load, and real task completion; automated rule coverage cannot replace these judgments.
- Include disabled, loading, empty, validation, failure, retry, and completion states in the proof when users can encounter them.
- Record exceptions with the affected criterion and journey, user impact, compensating behavior, owner, target date, and verification plan. An automated suppression without this record is not an exception policy.

Accessibility evidence is staged. Source inspection, component tests, and a local browser scan do not prove hosted CI coverage, the published artifact, deployed content, production personalization, or real assistive-technology behavior. Report each executed browser, device, viewport, assistive setup, journey, artifact, and stage.

## Failure handling

Block release of a changed critical journey when a user cannot perceive, understand, navigate, or complete it under the adopted baseline and no explicitly accepted exception exists. Preserve a usable fallback during remediation and avoid hiding defects by disabling automated rules without ownership and expiry.

## Acceptance criteria

- The repository records WCAG 2.2 AA or its explicit stricter/specific baseline and applicable journey scope.
- Changed interactions use correct semantics and work through keyboard, focus, zoom/reflow, and relevant reduced-motion or media behavior.
- Errors, status, loading, and recovery are perceivable and operable.
- Automated checks and documented manual critical-journey scenarios both pass or have owned exceptions.
- Reports distinguish local checks from CI, publication, deployment, and external or real-user evidence.

## Consequences

Design, content, component, and test work begin earlier and include more states and input modes. The result reduces exclusion and late retrofits while making accessibility an explicit product acceptance contract.
