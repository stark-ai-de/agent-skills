# Coordinated product-planning handoffs

Use only when a work item or accepted local coordination rule is supplied. Independent interviewer requests keep the existing workflow and do not require Architecture Zoom or Architecture Compass.

Read product-planning/v1 context through the [work-item template](../assets/product-planning-work-item.md). Reuse the product/release/slice identity, current blueprint, canonical contracts, relevant revision and uncommitted state, answered questions, fixed scope and non-goals, acceptance, evidence limits and genuine authorizations. A hash or approval field does not supply permission. Current local ADRs and host controls remain authoritative.

Select compact/standard/deep as before. Specify only the selected next slice, tracing it to a release that closes a complete user promise. A ticket or technical enabler can be smaller than that release but must name its consuming outcome; do not call it an MVP. Include success, material failure/recovery behavior and the required real integration/end-to-end evidence, not just mocked module tests.

If a material product promise is missing, return a targeted Zoom handoff to the coordinator. If a module contract or accepted architecture decision is unresolved, return its identity, violated criterion and bounded question for Compass. Do not start another whole planning chain, invoke unselected skills, save during audit/Plan, or change acceptance to bypass a blocker. Independent permitted draft work can continue.

Required decisions are handled through the existing ADR gate. One concrete final checkpoint can cover the unchanged spec and its authorized writes; reuse prior exact approval instead of asking again at every handoff. New outcomes, materially changed content or uncovered effects need their own decision. Delegates return results; one main agent integrates canonical artifacts.

On completion, emit the existing execution prompt with the current product/release/slice, scoped paths, non-goals, acceptance, relevant contracts and stop conditions. Do not implement. Stop when the planning deliverable is complete; optional improvements stay outside it. A later independently authorized implementation workflow may resume.
