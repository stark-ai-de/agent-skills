# Official Parity Profile

## Should Trigger

Yes.

## Prompt

Set up SkillOpt for `codex-spec-interviewer` with upstream-native optimizer behavior. I have provider credentials and want the run to follow official SkillOpt best practices as closely as this repo allows.

## Expected Behavior

- Activate `skillopt-setup`.
- Select `hybrid-codex-target` or `native-provider` with the `official-parity` run profile.
- Explain that provider-backed optimizer credentials are required for official-parity reflection, aggregation, ranking, slow update, and meta skill.
- Generate readiness output with `runProfile`, `officialParityStatus`, `officialParityGaps`, `datasetCounts`, `modelPins`, `configDefaults`, and `upstreamBehaviorBypassed`.
- Enable validation gate, test evaluation, cosine learning-rate schedule, slow update, and meta skill in the provider-backed config.
- Report blank or inherited optimizer, target, judge, or reflection model choices as reproducibility gaps.
- Mark the run exploratory when the target has too few positive, validation, or test cases.
- Keep any registry patch isolated to `.agents/tools/SkillOpt` and record it in `.agents/skillopt-work/<skill>/adapter-manifest.json`.

## Deterministic Assertions

- contains: official-parity
- contains: officialParityStatus
- contains: modelPins
- contains: use_slow_update: true
- contains: use_meta_skill: true
