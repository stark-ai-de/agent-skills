# Hard Assertion Gate Before Judge

## Should Trigger

Yes.

## Prompt

A generated draw.io benchmark case had deterministic assertions and visual assertions, but the semantic Codex judge passed a response even though the expected PNG export was blank. Harden SkillOpt scoring so hard assertions win.

## Expected Behavior

- Activate `skillopt-setup`.
- Carry `## Deterministic Assertions` and `## Visual Assertions` from Markdown cases into generated split JSON.
- Report deterministic and visual assertion coverage in dataset metadata or readiness output.
- Capture rollout artifacts with PNG/SVG metadata when target work produces visual outputs.
- Evaluate deterministic and visual assertions as hard gates before semantic LLM judging.
- Fail the item when any hard assertion fails, including missing visual artifacts or blank PNG output.
- Run the semantic Codex judge only when hard assertions are absent or when an explicitly safe fallback path is documented.
- Stratify visual-assertion cases into validation or test splits when possible so they are not all hidden in training.
- Do not let an LLM judge override failed deterministic or visual evidence.
