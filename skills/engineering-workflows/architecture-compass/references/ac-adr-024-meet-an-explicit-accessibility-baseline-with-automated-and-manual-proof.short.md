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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Start from WCAG 2.2 AA and prove critical interactions with both automation and representative manual use.

Variants: **Short** · [Long, canonical](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.long.md) · [Guide](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.guide.md)

## Decision summary

User-facing interfaces adopt WCAG 2.2 Level AA as the starter baseline unless the target repository records a stricter or more specific requirement. Implementations prefer semantic HTML, preserve keyboard and focus operation, expose clear names, instructions, errors, and status, and support contrast, reflow, zoom, reduced motion, and relevant media alternatives.

Automated checks are necessary regression coverage but never complete accessibility proof. Critical journeys also receive manual keyboard, focus, zoom/reflow, and representative screen-reader checks. Exceptions identify the affected criterion and journey, user impact, owner, mitigation, and resolution date. Local proof does not establish CI coverage, published artifact contents, or deployed accessibility.

## Read next

Read the [Long variant](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.long.md) before designing or changing a user-facing flow. Load the [Guide](ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof.guide.md) for an implementation and manual-test procedure with current W3C references.
