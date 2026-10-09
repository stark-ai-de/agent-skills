# Module-contract review

> Derived, non-normative asset. The applicable canonical Long ADRs prevail.

> Non-normative review aid for AC-ADR-067. Apply inside the selected Compass workflow; it does not authorize refactoring or add a workflow. Existing accepted local contracts prevail.

A module may be a function, package or larger coherent responsibility. Its interface is everything callers need for correct use: inputs/results, assumptions, invariants, ordering, error and recovery behavior, ownership, effects and relevant performance constraints. A small type signature alone is not a simple interface.

For the next product increment, ask whether callers can use the module without reconstructing its implementation. Keep related knowledge local and hide internal coordination, not decision-relevant assumptions. Compare alternatives when a consequential seam is unresolved; do not generate multiple designs ritualistically.

Check responsibilities, data ownership, dependency direction and shared invariants across modules. A storage/network/security boundary may be justified even with one current implementation. Conversely, a pass-through abstraction needs demonstrated leverage, isolation or ownership value; speculative future providers are not sufficient justification.

Plan tests through observable behavior, plus internal tests where they protect complex algorithms or failure logic. Do not delete existing tests without showing equivalent or stronger relevant coverage. A fake integration does not qualify the real dependency. Validate composed journeys, not only individual contracts.

Classify each finding as a required correction, an explicit user trade-off, or an optional improvement. Link the affected release promise and contract. Refine only enough to resolve that decision. Keep optional cleanups out of the current slice, and stop when its criteria are met.

Review result: owning contract, violated criterion, evidence, proposed bounded correction, affected consumers, and the remaining uncertainty. No formal-correctness or independent-review claim follows from an LLM self-review.
