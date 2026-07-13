# Captured Behavioral Evals

This directory stores reproducible, machine-regraded behavior samples for the
public `codegraph-ast-grep` skill. Each case contains:

- `prompt.md`: the exact clean-turn harness prompt and synthetic fixture facts;
- `captured-output.md`: the final assistant message from the recorded run;
- `grading.json`: deterministic assertions over that final message.

The fixtures are synthetic and public-safe. They do not claim that the named
tool versions, paths, or repository state were observed on the capture host. The
harness allowed read-only file access only to the repository candidate and its
task-routed references; it prohibited unrelated workspace inspection,
analysis-tool execution, network access, and writes. The JSONL event stream was
manually inspected before accepting each final message to confirm those reads
and the absence of disallowed tool actions. The committed final-message artifacts
alone do not independently prove those facts.

## Capture command

From the repository root, replace `<isolated-home>` with an empty temporary
directory, `<codex-home>` with the Codex home that supplies authentication, and
`<case>` with the capture directory, then run:

```bash
HOME="<isolated-home>" \
  CODEX_HOME="<codex-home>" \
codex exec \
  --ephemeral \
  --ignore-user-config \
  --ignore-rules \
  -m gpt-5.6-sol \
  -s read-only \
  --json \
  - < "skill-evals/codegraph-ast-grep/behavioral/<case>/prompt.md"
```

The committed `captured-output.md` is the final message normalized only by
repository Markdown formatting. Progress and tool-event JSON are not committed;
formatting may change Markdown spacing but does not edit the message's words or
claims. `manifest.json` records the runtime, model, candidate hash, thread
identifier, artifact paths, and grading totals for every capture.

## Deterministic grading

`grading.json` uses four operators:

- `contains`: the output must contain `value`;
- `not_contains`: the output must not contain `value`;
- `ordered`: each string in the `value` array must occur after the previous one;
- `count_exact`: `value` must occur exactly `expected_count` times.

Matching is byte-for-byte and case-sensitive. The repository validator must
recompute every assertion from `captured-output.md`; stored `passed`, `evidence`,
and summary totals are review records, not trusted inputs.

## Limits

These captures prove only that one named candidate/model run satisfied the
committed assertions for four fixed prompts. They do not provide a no-skill or
previous-version baseline, statistical reliability, live tool execution, or
coverage of every scenario case. Add a newly dated manifest or explicit baseline
artifacts before making any broader claim.
