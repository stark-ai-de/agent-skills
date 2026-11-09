# Greppy workspace evaluation

Evaluation for the canonical setup skill. This does not imply bundle admission or publication. Live qualification remains bounded by documented observations. Run `python3 -B -m unittest discover -s skill-evals/greppy-workspace -p 'test_*.py' -v` with Python/PyYAML and Git. The fixtures are generated in temporary directories and contain no private source or account values. Owner-specific tests run through `pnpm run validate:karakeep`.

Completion-receiver fixtures cover legacy notify argv/stdin, Stop-hook stdin,
quiet hook success, non-continuing hook failures, scope and maintenance filters,
and minimal receipts that coalesce repeated Stop events. They do not qualify a
real Codex hook session, a `uv` dependency cache or cold start, a timer, or a
provider execution. Keep the existing installation on notify until a separate
adopted rollout proves those runtime boundaries.

Live qualification is required separately by the skill's `references/qualification.md`. Keep actual account IDs, paths, provider logs, candidate sources and receipts in the adopter's private operations directory. Synthetic tests do not qualify an installation, live account or model provider. A reusable skill handoff must include the actual fresh-agent usability outcome and any unresolved gates.
