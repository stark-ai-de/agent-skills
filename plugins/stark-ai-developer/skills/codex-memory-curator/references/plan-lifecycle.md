# Curation Plan Lifecycle

Read for a `plan-*` route, a pending material decision, or a native Plan transition.

The four `plan-*` routes require a reviewable cleanup plan and approval, not a mandatory manual mode switch:

1. Detect native Plan mode and actual permissions separately. Respect active or explicitly requested native Plan mode. Recommend it for substantial ambiguous planning, but continue permissible read-only discovery and conversation when it is inactive, unavailable, declined, or indeterminate; do not claim a mode change.
2. Use the same conversational planning contract without suitable native controls. Unknown mode or permission state never permits writes. Native Plan restrictions apply to reports, backups, and cleanup alike; defer file delivery until writes are permitted.
3. Resolve material choices using available structured or asynchronous question tools, otherwise ordinary conversation. While an answer is pending, continue only independent authorized work. Silence, timeouts, and preselected options are not approval.
4. Prepare the complete reviewable plan with exact paths, report creation, backup, and cleanup actions before requesting any missing approval. Reuse earlier approval of the unchanged plan and named actions. A native approval can cover this checkpoint when it confirms both content and write scope; a mode toggle alone cannot.
5. Before any write, recheck target files and protected state and exit active Plan mode through the host's supported control. Preserve approval across that transition. If content, scope, destination, or target state materially changes, reconfirm only the affected action; otherwise proceed within actual permissions without a second approval.

Plan-only routes still stop after delivering the approved plan. Execution authority, file delivery authority, and host write permission remain separate.
