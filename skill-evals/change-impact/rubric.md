# change-impact pilot rubric

Grade the agent's final investigation separately from the provider's candidate
scores. Freeze independently reviewed reference findings before blind runs.

## Finding quality

- A true positive identifies the reference behavior contract and omitted artifact,
  quotes exact current source, and explains the concrete contradiction. Alternate
  wording is acceptable; a path or low confidence score alone is not a finding.
- Count each contract/artifact pair once. Multiple descriptions of the same
  omission do not increase recall. Keep duplicates visible in the capture.
- An unsupported allegation, an unrelated behavior, a historical description, or
  a complaint about already-correct generated output is a false positive.
- A plausible but unconfirmed candidate must remain unconfirmed. Do not count it
  as either a confirmed true positive or proof that no problem exists.
- Follow generated artifacts to their canonical source. Preserve historical
  records and intentionally separate domain behavior.
- If an independent grader discovers a defect in the reference key, invalidate
  the affected comparison, review and version the correction, and rerun matched
  arms. Do not silently change labels to reward an observed output.

## Coverage and effort

Report true positives, false positives, false negatives, and duplicate findings
per case and arm. Report false alarms for clean cases directly; recall is not
applicable when there are no reference findings. Separate failures to collect an
artifact from failures to prioritize or confirm an available candidate.

Record total wall-clock time, deeply investigated candidate count, model input
and output tokens, and complete workflow model cost. Include host reasoning,
provider requests and retries, and final confirmation. Provider-only cost or
latency cannot stand in for the full workflow. Retain model/version, exact
snapshot and candidate identities, and live/mock provenance. Unknown data is an
evidence gap, not a zero-cost or zero-error observation.

Each arm may deeply investigate at most ten candidates. Prefer the same host
model, reasoning configuration, and tool access for all arms. Use independent
fresh contexts and vary arm execution order to reduce timing/order effects.
Do not give a host arm answers or extra context learned while running Jev.

## Pilot advancement

Compare Jev against the matched host-only workflow; report the ordinary-agent arm
alongside them so the workflow's own contribution remains visible. Advance only
if either condition holds, with no increase in false positives:

- Jev finds additional confirmed omissions with at most 25% greater measured
  full-workflow effort.
- Jev retains every confirmed host-only finding while reducing complete workflow
  model cost by at least 25%.

The predeclared effort measure for this pilot is the number of deeply investigated
candidates, including dismissed ones. Retain the raw
elapsed-time and investigation-count measurements. Do not substitute a favorable
metric after seeing results. Missing required costs/effort, missing arms, mixed
snapshots, exceeded budgets, or mock captures leave the criterion undecidable.
A missing credential or failed request is incomplete evidence, never a clean run.

Repeat the selected criterion on the four held-out cases without changing the
workflow or thresholds. A failed held-out result does not permit tuning on those
same cases while still calling them held-out. Further development needs new
independent cases. Even a successful small pilot only justifies the next
repository promotion decision; it does not establish universal reliability.
