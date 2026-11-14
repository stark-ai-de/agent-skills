# Greppy workspace evaluation

- Evaluation for the canonical setup skill.
- This does not imply bundle admission or publication.
- Live qualification remains bounded by documented observations.
- Run `python3 -B -m unittest discover -s skill-evals/greppy-workspace -p 'test_*.py' -v` with Python/PyYAML and Git.
- The fixtures are generated in temporary directories and contain no private source or account values.
- Owner-specific tests run through `pnpm run validate:karakeep`.

- Live qualification is required separately by the skill's `references/qualification.md`.
- Keep actual account IDs, paths, provider logs, candidate sources and receipts in the adopter's private operations directory.
- Synthetic tests do not qualify an installation, live account or model provider.
- A reusable skill handoff must include the actual fresh-agent usability outcome and any unresolved gates.

## Runtime extraction

- The shared Python and JavaScript implementation, its assessment schema and the 40 existing runtime tests now belong to the Greppy package.
- Run `make check` in a reviewed Greppy source snapshot.
- This directory validates the legacy launchers only; it must not acquire another orchestrator implementation.
- Legacy installed skill paths delegate to the package after the reviewed consumer migration.
