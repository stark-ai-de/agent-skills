# Internal and Public ADR Namespace Separation

## Should Trigger

Yes.

## Prompt

Evaluate two synthetic maintenance fixtures after Architecture Compass adds
implementation-only decisions under `references/internal/`:

1. An accepted public Long decision forbids a wrong-host persistence write,
   while an internal Long says to perform it.
2. A maintainer calls an internal rule “public” by changing metadata and adding
   one catalog link, but does not create a new exposed triplet, decision lock,
   lineage entry, or focused validation proof.

Report the governing outcome and every promotion gate without copying internal
mechanics into target repositories.

## Deterministic Assertions

- contains: references/internal/
- contains: internal ADR
- contains: public catalog
- contains: target adoption matrix
- contains: Short
- contains: Long
- contains: Guide
- contains: promotion
- contains: not adoptable
- contains: public Long governs
- contains: affected route blocked
- contains: promotion incomplete
- contains: new exposed triplet
- contains: catalog row
- contains: decision lock
- contains: lineage entry
- contains: focused validation
- not_contains: internal ADR in the public catalog
- not_contains: copied into the target repository
- not_contains: internal Long governs
- not_contains: metadata-only promotion complete

## Expected Behavior

- Validate internal decisions as complete Short/Long/Guide triplets in their
  separate namespace, with their own index and metadata checks.
- Keep internal mechanics out of `references/adr-catalog.md`, public catalog
  routes, target adoption matrices, and installed target-repository governance.
- Route generalized, reusable behavior through exposed Architecture Compass
  ADR triplets; promotion from internal to public requires an explicit review,
  canonical Long authority, lineage, and catalog/index updates.
- Preserve public Long decisions as authoritative when internal guidance is
  incomplete, stale, or contradictory. In the synthetic conflict, say that the
  public Long governs and the affected route stays blocked until the internal
  record is repaired or the public decision is deliberately superseded.
- Reject the metadata-only promotion as incomplete. Require a new exposed
  Short/Long/Guide triplet with a public ID, catalog row, accepted-decision
  lock, lineage entry, and focused validation before calling the rule public.
- Do not duplicate the same rule as two competing public decisions.
