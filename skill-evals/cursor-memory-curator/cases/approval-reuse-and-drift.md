# Approval Survives Mode Exit

## Should Trigger

Yes.

## Prompt

The complete Cursor context cleanup plan, exact report path, backup scope, and edits were approved in the previous turn. Native Plan mode has now ended and writes are permitted. Continue the unchanged plan.

## Expected Behavior

Reuse the recorded approval, recheck target state, persist the single record and exact backups in the required order, and perform only the approved plan. Do not repeat the selector or ask a generic second cleanup question. In the paired case where a target file changed materially after approval, stop that action and show the changed evidence before requesting a bounded decision; earlier unrelated approval remains valid. Approval of a plan-only route never becomes execution authority merely because Plan mode ended.
